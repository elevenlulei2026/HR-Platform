package com.hrplatform.core.employee;

import com.hrplatform.platform.crypto.FieldCryptoService;

import java.beans.Introspector;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * 档案 API 响应组装：敏感字段按权限脱敏，并附带 *Masked 标记。
 */
public final class EmployeeArchiveResponseMapper {
  private EmployeeArchiveResponseMapper() {}

  public static Map<String, Object> toMap(
      Object bean,
      FieldCryptoService crypto,
      boolean revealSensitive
  ) {
    if (bean instanceof EmployeeIdDocumentEntity doc) {
      return toIdDocumentMap(doc, crypto, revealSensitive);
    }
    if (bean instanceof EmployeeBankAccountEntity bank) {
      return toBankAccountMap(bank, crypto, revealSensitive);
    }
    if (bean instanceof EmployeeSocialInsuranceEntity ins) {
      return toSocialInsuranceMap(ins, crypto, revealSensitive);
    }
    return toPlainMap(bean);
  }

  public static Map<String, Object> toIdDocumentMap(
      EmployeeIdDocumentEntity doc,
      FieldCryptoService crypto,
      boolean revealSensitive
  ) {
    Map<String, Object> dto = toPlainMap(doc);
    String plain = crypto.decrypt(doc.getIdNumber());
    dto.put("idNumber", revealSensitive ? plain : crypto.maskIdNumber(plain));
    dto.put("idNumberMasked", !revealSensitive);
    return dto;
  }

  public static Map<String, Object> toBankAccountMap(
      EmployeeBankAccountEntity bank,
      FieldCryptoService crypto,
      boolean revealSensitive
  ) {
    Map<String, Object> dto = toPlainMap(bank);
    if (bank.getAccountNo() != null && !bank.getAccountNo().isBlank()) {
      String plain = crypto.decrypt(bank.getAccountNo());
      dto.put("accountNo", revealSensitive ? plain : crypto.maskAccountNo(plain));
      dto.put("accountNoMasked", !revealSensitive);
    } else {
      dto.put("accountNoMasked", false);
    }
    return dto;
  }

  public static Map<String, Object> toSocialInsuranceMap(
      EmployeeSocialInsuranceEntity ins,
      FieldCryptoService crypto,
      boolean revealSensitive
  ) {
    Map<String, Object> dto = toPlainMap(ins);
    if (ins.getSocialSecurityNo() != null && !ins.getSocialSecurityNo().isBlank()) {
      String plain = crypto.decrypt(ins.getSocialSecurityNo());
      dto.put("socialSecurityNo", revealSensitive ? plain : crypto.maskGeneric(plain));
      dto.put("socialSecurityNoMasked", !revealSensitive);
    } else {
      dto.put("socialSecurityNoMasked", false);
    }
    return dto;
  }

  public static Map<String, Object> toPlainMap(Object bean) {
    try {
      Map<String, Object> dto = new HashMap<>();
      var beanInfo = Introspector.getBeanInfo(bean.getClass(), Object.class);
      for (var pd : beanInfo.getPropertyDescriptors()) {
        if (pd.getReadMethod() == null) continue;
        Object value = pd.getReadMethod().invoke(bean);
        String key = pd.getName();
        if (value instanceof LocalDate date) {
          dto.put(key, date.toString());
        } else if (value instanceof LocalDateTime dateTime) {
          dto.put(key, dateTime.toString());
        } else if (value instanceof Long longValue && ("id".equals(key) || key.endsWith("Id"))) {
          dto.put(key, String.valueOf(longValue));
        } else {
          dto.put(key, value);
        }
      }
      return dto;
    } catch (Exception e) {
      throw new IllegalStateException("组装档案响应失败", e);
    }
  }
}
