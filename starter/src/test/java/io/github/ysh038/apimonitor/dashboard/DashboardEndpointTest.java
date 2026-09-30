package io.github.ysh038.apimonitor.dashboard;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import org.junit.jupiter.api.Test;

class DashboardEndpointTest {

    @Test
    void servesIndexFaviconAndHashedAssets() {
        assertEquals("index.html", DashboardEndpoint.staticFile(""));
        assertEquals("index.html", DashboardEndpoint.staticFile("index.html"));
        assertEquals("favicon.svg", DashboardEndpoint.staticFile("favicon.svg"));
        assertEquals("assets/index-BcgUg_8u.js", DashboardEndpoint.staticFile("assets/index-BcgUg_8u.js"));
        assertEquals("assets/index-CTMqrW6Z.css", DashboardEndpoint.staticFile("assets/index-CTMqrW6Z.css"));
    }

    @Test
    void rejectsTraversalAndOtherResources() {
        assertNull(DashboardEndpoint.staticFile("assets/.."));
        assertNull(DashboardEndpoint.staticFile("assets/../../application.yml"));
        assertNull(DashboardEndpoint.staticFile("assets/..%2F..%2Fapplication.yml"));
        assertNull(DashboardEndpoint.staticFile("assets/a/b.js"));
        assertNull(DashboardEndpoint.staticFile("assets/.hidden"));
        assertNull(DashboardEndpoint.staticFile("assets\\\\x.js"));
        assertNull(DashboardEndpoint.staticFile("/etc/passwd"));
        assertNull(DashboardEndpoint.staticFile("../META-INF/MANIFEST.MF"));
        assertNull(DashboardEndpoint.staticFile("application.yml"));
        assertNull(DashboardEndpoint.staticFile("app.js"));
    }
}
