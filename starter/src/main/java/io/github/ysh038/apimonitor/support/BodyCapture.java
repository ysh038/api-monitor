package io.github.ysh038.apimonitor.support;

import java.io.ByteArrayOutputStream;
import java.nio.charset.Charset;

/**
 * 스트림을 그대로 흘려보내면서 앞부분 limit 만큼만 복사해 두는 버퍼.
 * 바이트(OutputStream)와 문자(Writer) 경로를 모두 받는다. SSE처럼 다른 스레드에서 쓰일 수 있어 동기화한다.
 */
public final class BodyCapture {

    private final int limit;
    private final ByteArrayOutputStream bytes = new ByteArrayOutputStream();
    private final StringBuilder chars = new StringBuilder();
    private long totalBytes;
    private long totalChars;

    public BodyCapture(int limit) {
        this.limit = Math.max(limit, 0);
    }

    public synchronized void write(int b) {
        totalBytes++;
        if (bytes.size() < limit) {
            bytes.write(b);
        }
    }

    public synchronized void write(byte[] b, int off, int len) {
        totalBytes += len;
        int room = limit - bytes.size();
        if (room > 0) {
            bytes.write(b, off, Math.min(room, len));
        }
    }

    public synchronized void write(char[] c, int off, int len) {
        totalChars += len;
        int room = limit - chars.length();
        if (room > 0) {
            chars.append(c, off, Math.min(room, len));
        }
    }

    public synchronized void write(String s, int off, int len) {
        totalChars += len;
        int room = limit - chars.length();
        if (room > 0) {
            chars.append(s, off, off + Math.min(room, len));
        }
    }

    public synchronized long total() {
        return totalBytes + totalChars;
    }

    public synchronized boolean truncated() {
        return totalBytes > bytes.size() || totalChars > chars.length();
    }

    /** Writer로 쓴 문자와 OutputStream으로 쓴 바이트를 합쳐 문자열로 만든다. */
    public synchronized Snapshot snapshot() {
        return new Snapshot(bytes.toByteArray(), chars.toString(), totalBytes + totalChars, truncated());
    }

    public record Snapshot(byte[] bytes, String chars, long total, boolean truncated) {
        public String asString(Charset charset) {
            if (bytes.length == 0) {
                return chars;
            }
            String s = new String(bytes, charset);
            return chars.isEmpty() ? s : s + chars;
        }
    }
}
