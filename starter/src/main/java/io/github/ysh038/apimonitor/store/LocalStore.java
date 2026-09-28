package io.github.ysh038.apimonitor.store;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Deque;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.locks.ReentrantReadWriteLock;
import java.util.function.Function;
import java.util.stream.Stream;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import io.github.ysh038.apimonitor.support.JsonParser;

/**
 * 내장 대시보드용 저장소.
 * - 이벤트를 날짜별 파일(api-monitor-YYYY-MM-DD.jsonl)에 한 줄씩 추가한다.
 * - 최근 maxInMemory 건은 메모리에 두고 대시보드 조회에 쓴다.
 * - 앱이 켜질 때 최근 파일을 다시 읽어 메모리를 채우고, retentionDays 가 지난 파일은 지운다.
 * 파일을 쓸 수 없는 환경이면 메모리에만 보관한다.
 */
public final class LocalStore implements AutoCloseable {

    private static final Logger log = LoggerFactory.getLogger(LocalStore.class);
    private static final String PREFIX = "api-monitor-";
    private static final String SUFFIX = ".jsonl";

    public record Entry(long id, Map<String, Object> event) {
    }

    private final Path dir;
    private final int maxInMemory;
    private final int retentionDays;
    private final Deque<Entry> entries = new ArrayDeque<>();
    private final Map<String, Integer> childCounts = new HashMap<>();
    private final ReentrantReadWriteLock lock = new ReentrantReadWriteLock();
    private long nextId = 1;
    private BufferedWriter writer;
    private LocalDate writerDate;

    public LocalStore(Path dir, int maxInMemory, int retentionDays) {
        this.maxInMemory = Math.max(100, maxInMemory);
        this.retentionDays = Math.max(1, retentionDays);
        this.dir = prepare(dir);
        if (this.dir != null) {
            purgeOldFiles();
            load();
        }
    }

    private static Path prepare(Path dir) {
        if (dir == null) {
            return null;
        }
        try {
            Files.createDirectories(dir);
            if (!Files.isWritable(dir)) {
                throw new IOException("쓰기 권한 없음");
            }
            return dir.toAbsolutePath().normalize();
        } catch (IOException | RuntimeException e) {
            log.warn("[api-monitor] 저장 폴더를 쓸 수 없어 메모리에만 보관합니다 ({}): {}", dir, e.toString());
            return null;
        }
    }

    /** 실제 저장 폴더 (파일을 못 쓰면 null). */
    public Path directory() {
        return dir;
    }

    public void add(Map<String, Object> event, String json) {
        lock.writeLock().lock();
        try {
            append(json);
            push(event);
        } finally {
            lock.writeLock().unlock();
        }
    }

    /** 읽기 잠금 안에서 조회한다. entries 는 오래된 것 → 최신 순. */
    public <T> T read(Function<View, T> query) {
        lock.readLock().lock();
        try {
            return query.apply(new View(entries, childCounts));
        } finally {
            lock.readLock().unlock();
        }
    }

    /** 읽기 전용 조회 뷰. read() 밖으로 꺼내 쓰지 않는다. */
    public static final class View {
        private final Deque<Entry> deque;
        private final Map<String, Integer> childCounts;

        View(Deque<Entry> deque, Map<String, Integer> childCounts) {
            this.deque = deque;
            this.childCounts = childCounts;
        }

        /** 오래된 것 → 최신 순. */
        public java.util.Collection<Entry> entries() {
            return Collections.unmodifiableCollection(deque);
        }

        /** 최신 → 오래된 순. */
        public java.util.Iterator<Entry> newestFirst() {
            java.util.Iterator<Entry> it = deque.descendingIterator();
            return new java.util.Iterator<>() {
                public boolean hasNext() { return it.hasNext(); }
                public Entry next() { return it.next(); }
            };
        }

        public int childCount(String requestId) {
            return requestId == null ? 0 : childCounts.getOrDefault(requestId, 0);
        }
    }

    private void push(Map<String, Object> event) {
        entries.addLast(new Entry(nextId++, event));
        adjustChild(event, +1);
        while (entries.size() > maxInMemory) {
            adjustChild(entries.removeFirst().event(), -1);
        }
    }

    private void adjustChild(Map<String, Object> event, int delta) {
        Object parent = event.get("parentRequestId");
        if (parent == null) {
            return;
        }
        childCounts.merge(parent.toString(), delta, (a, b) -> a + b <= 0 ? null : a + b);
    }

    private void append(String json) {
        if (dir == null) {
            return;
        }
        try {
            LocalDate today = LocalDate.now();
            if (writer == null || !today.equals(writerDate)) {
                closeWriter();
                writer = Files.newBufferedWriter(dir.resolve(PREFIX + today + SUFFIX), StandardCharsets.UTF_8,
                        StandardOpenOption.CREATE, StandardOpenOption.APPEND);
                writerDate = today;
                purgeOldFiles();
            }
            writer.write(json);
            writer.newLine();
            writer.flush();
        } catch (IOException e) {
            log.debug("[api-monitor] 파일 저장 실패 (메모리에는 보관): {}", e.toString());
        }
    }

    private List<Path> files() throws IOException {
        try (Stream<Path> s = Files.list(dir)) {
            return s.filter(p -> {
                String n = p.getFileName().toString();
                return n.startsWith(PREFIX) && n.endsWith(SUFFIX);
            }).sorted().toList();
        }
    }

    private static LocalDate dateOf(Path p) {
        String n = p.getFileName().toString();
        try {
            return LocalDate.parse(n.substring(PREFIX.length(), n.length() - SUFFIX.length()));
        } catch (DateTimeParseException | IndexOutOfBoundsException e) {
            return null;
        }
    }

    private void purgeOldFiles() {
        LocalDate cutoff = LocalDate.now().minusDays(retentionDays);
        try {
            for (Path p : files()) {
                LocalDate d = dateOf(p);
                if (d != null && d.isBefore(cutoff)) {
                    Files.deleteIfExists(p);
                }
            }
        } catch (IOException e) {
            log.debug("[api-monitor] 오래된 파일 정리 실패: {}", e.toString());
        }
    }

    /** 최신 파일부터 거꾸로 읽어 maxInMemory 건을 모은 뒤, 오래된 순으로 메모리에 넣는다. */
    private void load() {
        List<Map<String, Object>> loaded = new ArrayList<>();
        try {
            List<Path> files = new ArrayList<>(files());
            Collections.reverse(files);
            for (Path p : files) {
                List<Map<String, Object>> day = new ArrayList<>();
                try (BufferedReader r = Files.newBufferedReader(p, StandardCharsets.UTF_8)) {
                    String line;
                    while ((line = r.readLine()) != null) {
                        if (line.isBlank()) {
                            continue;
                        }
                        try {
                            day.add(JsonParser.parseObject(line));
                        } catch (RuntimeException ignored) {
                            // 쓰다 끊긴 줄 등은 건너뛴다
                        }
                    }
                }
                loaded.addAll(0, day);
                if (loaded.size() >= maxInMemory) {
                    break;
                }
            }
        } catch (IOException e) {
            log.debug("[api-monitor] 이전 기록 읽기 실패: {}", e.toString());
        }
        int from = Math.max(0, loaded.size() - maxInMemory);
        for (Map<String, Object> e : loaded.subList(from, loaded.size())) {
            push(e);
        }
        if (!loaded.isEmpty()) {
            log.info("[api-monitor] 이전 기록 {}건을 불러왔습니다.", loaded.size() - from);
        }
    }

    private void closeWriter() {
        if (writer != null) {
            try {
                writer.close();
            } catch (IOException ignored) {
                // 무시
            }
            writer = null;
        }
    }

    @Override
    public void close() {
        lock.writeLock().lock();
        try {
            closeWriter();
        } finally {
            lock.writeLock().unlock();
        }
    }
}
