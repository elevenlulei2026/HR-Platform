package com.hrplatform.platform.debug;

import java.io.FileWriter;
import java.nio.charset.StandardCharsets;
import java.util.Map;

public final class DebugLog {
  private DebugLog() {}

  public static void log(String runId, String hypothesisId, String location, String message, Map<String, Object> data) {
    try (FileWriter fw = new FileWriter("debug-5d0fbc.log", StandardCharsets.UTF_8, true)) {
      long ts = System.currentTimeMillis();
      String json = "{\"sessionId\":\"5d0fbc\",\"runId\":\"" + esc(runId)
          + "\",\"hypothesisId\":\"" + esc(hypothesisId)
          + "\",\"location\":\"" + esc(location)
          + "\",\"message\":\"" + esc(message)
          + "\",\"data\":" + (data == null ? "{}" : mapToJson(data))
          + ",\"timestamp\":" + ts + "}\n";
      fw.write(json);
    } catch (Exception ignored) {
      // ignore debug logging failures
    }
  }

  public static void logAbs(String runId, String hypothesisId, String location, String message, Map<String, Object> data) {
    try (FileWriter fw = new FileWriter("D:\\文档\\HR Platform\\debug-5d0fbc.log", StandardCharsets.UTF_8, true)) {
      long ts = System.currentTimeMillis();
      String json = "{\"sessionId\":\"5d0fbc\",\"runId\":\"" + esc(runId)
          + "\",\"hypothesisId\":\"" + esc(hypothesisId)
          + "\",\"location\":\"" + esc(location)
          + "\",\"message\":\"" + esc(message)
          + "\",\"data\":" + (data == null ? "{}" : mapToJson(data))
          + ",\"timestamp\":" + ts + "}\n";
      fw.write(json);
    } catch (Exception ignored) {
      // ignore debug logging failures
    }
  }

  private static String esc(String s) {
    if (s == null) return "";
    return s.replace("\\", "\\\\").replace("\"", "\\\"");
  }

  private static String mapToJson(Map<String, Object> map) {
    StringBuilder sb = new StringBuilder();
    sb.append("{");
    boolean first = true;
    for (Map.Entry<String, Object> e : map.entrySet()) {
      if (!first) sb.append(",");
      first = false;
      sb.append("\"").append(esc(e.getKey())).append("\":");
      Object v = e.getValue();
      if (v == null) {
        sb.append("null");
      } else if (v instanceof Number || v instanceof Boolean) {
        sb.append(v.toString());
      } else {
        sb.append("\"").append(esc(String.valueOf(v))).append("\"");
      }
    }
    sb.append("}");
    return sb.toString();
  }
}

