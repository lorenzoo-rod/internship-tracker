package com.internshiphub;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.io.ByteArrayOutputStream;
import java.io.PrintStream;
import java.nio.charset.StandardCharsets;

import org.junit.jupiter.api.Test;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.boot.web.server.WebServer;
import org.springframework.boot.web.servlet.context.ServletWebServerApplicationContext;

class DesktopReadyReporterTest {
    @Test
    void reportsTheBoundPortOnlyForDesktopLaunches() {
        ServletWebServerApplicationContext context = mock(ServletWebServerApplicationContext.class);
        WebServer server = mock(WebServer.class);
        when(context.getWebServer()).thenReturn(server);
        when(server.getPort()).thenReturn(18080);
        ApplicationReadyEvent event = mock(ApplicationReadyEvent.class);
        when(event.getApplicationContext()).thenReturn(context);

        PrintStream original = System.out;
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        try {
            System.setOut(new PrintStream(output, true, StandardCharsets.UTF_8));
            new DesktopReadyReporter("launch-token").reportReady(event);
            assertEquals("INTERNSHIP_HUB_READY launch-token 18080" + System.lineSeparator(), output.toString(StandardCharsets.UTF_8));

            output.reset();
            new DesktopReadyReporter("").reportReady(event);
            assertEquals("", output.toString(StandardCharsets.UTF_8));
        } finally {
            System.setOut(original);
        }
    }
}
