package com.hrplatform.modules.jobmovement;

import java.util.Map;
import java.util.Set;

/** PRO / DEM / SPR 与流程定义、业务类型映射 */
public final class JobMovementTypes {
  public static final String PRO = "PRO";
  public static final String DEM = "DEM";
  public static final String SPR = "SPR";

  public static final Set<String> ALL = Set.of(PRO, DEM, SPR);

  public static final Map<String, String> TYPE_NAMES = Map.of(
      PRO, "晋升晋级",
      DEM, "降职降级",
      SPR, "雇佣类型变更"
  );

  public static final Map<String, String> DEFINITION_CODES = Map.of(
      PRO, "promotion",
      DEM, "demotion",
      SPR, "employment_type_change"
  );

  public static final Map<String, String> BUSINESS_TYPES = Map.of(
      PRO, "PROMOTION",
      DEM, "DEMOTION",
      SPR, "EMPLOYMENT_TYPE_CHANGE"
  );

  public static final Map<String, String> SOURCE_TYPES = Map.of(
      PRO, "promotion",
      DEM, "demotion",
      SPR, "employment_type_change"
  );

  private JobMovementTypes() {}

  public static String requireType(String code) {
    if (code == null || code.isBlank()) throw new IllegalArgumentException("异动类型不能为空");
    String c = code.trim().toUpperCase();
    if (!ALL.contains(c)) throw new IllegalArgumentException("不支持的异动类型: " + code);
    return c;
  }

  public static String businessTypeOf(String movementType) {
    return BUSINESS_TYPES.get(requireType(movementType));
  }

  public static String definitionCodeOf(String movementType) {
    return DEFINITION_CODES.get(requireType(movementType));
  }

  public static String parseMovementTypeFromBusinessType(String businessType) {
    if (businessType == null) return null;
    return switch (businessType.trim().toUpperCase()) {
      case "PROMOTION" -> PRO;
      case "DEMOTION" -> DEM;
      case "EMPLOYMENT_TYPE_CHANGE" -> SPR;
      default -> null;
    };
  }
}
