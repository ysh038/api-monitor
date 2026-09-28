package io.github.ysh038.apimonitor.inbound;

import java.io.IOException;
import java.io.PrintWriter;

import io.github.ysh038.apimonitor.support.BodyCapture;

import jakarta.servlet.ServletOutputStream;
import jakarta.servlet.WriteListener;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpServletResponseWrapper;

/**
 * 응답을 버퍼링하지 않고 그대로 클라이언트에 흘려보내면서 앞부분만 복사한다.
 * ContentCachingResponseWrapper와 달리 SSE·대용량 다운로드의 스트리밍 동작을 바꾸지 않는다.
 */
final class CapturingResponseWrapper extends HttpServletResponseWrapper {

    private final BodyCapture capture;
    private ServletOutputStream outputStream;
    private PrintWriter writer;

    CapturingResponseWrapper(HttpServletResponse response, int limit) {
        super(response);
        this.capture = new BodyCapture(limit);
    }

    BodyCapture capture() {
        return capture;
    }

    @Override
    public ServletOutputStream getOutputStream() throws IOException {
        if (outputStream == null) {
            outputStream = new TeeOutputStream(super.getOutputStream(), capture);
        }
        return outputStream;
    }

    @Override
    public PrintWriter getWriter() throws IOException {
        if (writer == null) {
            writer = new TeeWriter(super.getWriter(), capture);
        }
        return writer;
    }

    private static final class TeeOutputStream extends ServletOutputStream {
        private final ServletOutputStream delegate;
        private final BodyCapture capture;

        TeeOutputStream(ServletOutputStream delegate, BodyCapture capture) {
            this.delegate = delegate;
            this.capture = capture;
        }

        @Override
        public void write(int b) throws IOException {
            delegate.write(b);
            capture.write(b);
        }

        @Override
        public void write(byte[] b, int off, int len) throws IOException {
            delegate.write(b, off, len);
            capture.write(b, off, len);
        }

        @Override
        public void flush() throws IOException {
            delegate.flush();
        }

        @Override
        public void close() throws IOException {
            delegate.close();
        }

        @Override
        public boolean isReady() {
            return delegate.isReady();
        }

        @Override
        public void setWriteListener(WriteListener listener) {
            delegate.setWriteListener(listener);
        }
    }

    /** 실제 컨테이너 Writer를 그대로 쓰므로 flush/인코딩 동작이 원래와 같다. */
    private static final class TeeWriter extends PrintWriter {
        private final PrintWriter delegate;
        private final BodyCapture capture;

        TeeWriter(PrintWriter delegate, BodyCapture capture) {
            super(delegate);
            this.delegate = delegate;
            this.capture = capture;
        }

        @Override
        public void write(int c) {
            delegate.write(c);
            capture.write(new char[] {(char) c}, 0, 1);
        }

        @Override
        public void write(char[] buf, int off, int len) {
            delegate.write(buf, off, len);
            capture.write(buf, off, len);
        }

        @Override
        public void write(String s, int off, int len) {
            delegate.write(s, off, len);
            capture.write(s, off, len);
        }

        @Override
        public void println() {
            write(System.lineSeparator());
        }

        @Override
        public void flush() {
            delegate.flush();
        }

        @Override
        public void close() {
            delegate.close();
        }

        @Override
        public boolean checkError() {
            return delegate.checkError();
        }
    }
}
