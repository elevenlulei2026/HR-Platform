package com.hrplatform.modules.contractchange;

import java.util.Map;
import java.util.Set;

/** 续签 / 变更 与流程定义、业务类型映射 */
public final class ContractChangeTypes {
  public static final String RENEWAL = "RENEWAL";
  public static final String CHANGE = "CHANGE";

  public static final String CONTRACT = "CONTRACT";
  public static final String AGREEMENT = "AGREEMENT";

  public static final Set<String> REQUEST_TYPES = Set.of(RENEWAL, CHANGE);
  public static final Set<String> TARGET_KINDS = Set.of(CONTRACT, AGREEMENT);

  public static final Map<String, String> REQUEST_TYPE_NAMES = Map.of(
      RENEWAL, "续签",
      CHANGE, "变更"
  );

  public static final Map<String, String> TARGET_KIND_NAMES = Map.of(
      CONTRACT, "劳动合同",
      AGREEMENT, "协议"
  );

  public static final Map<String, String> DEFINITION_CODES = Map.of(
      RENEWAL, "contract_renewal",
      CHANGE, "contract_change"
  );

  public static final Map<String, String> BUSINESS_TYPES = Map.of(
      RENEWAL, "CONTRACT_RENEWAL",
      CHANGE, "CONTRACT_CHANGE"
  );

  /** 档案操作类型：续签 20 / 变更 30 */
  public static final String OP_RENEWAL = "20";
  public static final String OP_CHANGE = "30";

  private ContractChangeTypes() {}

  public static String requireRequestType(String code) {
    if (code == null || code.isBlank()) throw new IllegalArgumentException("单据类型不能为空");
    String c = code.trim().toUpperCase();
    if (!REQUEST_TYPES.contains(c)) throw new IllegalArgumentException("不支持的单据类型: " + code);
    return c;
  }

  public static String requireTargetKind(String code) {
    if (code == null || code.isBlank()) throw new IllegalArgumentException("目标类型不能为空");
    String c = code.trim().toUpperCase();
    if (!TARGET_KINDS.contains(c)) throw new IllegalArgumentException("不支持的目标类型: " + code);
    return c;
  }

  public static String definitionCodeOf(String requestType) {
    return DEFINITION_CODES.get(requireRequestType(requestType));
  }

  public static String businessTypeOf(String requestType) {
    return BUSINESS_TYPES.get(requireRequestType(requestType));
  }
}
