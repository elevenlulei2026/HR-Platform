import type {
  Employee,
  EmployeeAttendanceCardEditMode,
  OrganizationTreeNode,
} from "@shared/api.interface";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  Download,
  Inbox,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Shield,
  Trash2,
  Upload,
  UserRound,
} from "lucide-react";

import type { ApiError } from "@/api/http";
import {
  createArchiveData,
  deleteArchiveData,
  exportArchiveData,
  listArchiveData,
  updateArchiveData,
} from "@/api/archive-data";
import { listDictItemsByTypeCode } from "@/api/dict";
import { getEmployeeFormOptions, listEmployees } from "@/api/employee";
import { flattenOrgTree, getOrganizationTree, listLegalEntities } from "@/api/organization";
import { listChildrenByParent, listParentsByType } from "@/api/parent-child-catalog";
import { ArchiveDataImportDialog } from "@/components/admin/archive-data/ArchiveDataImportDialog";
import { ArchiveDataPageChrome } from "@/components/admin/archive-data/ArchiveDataPageChrome";
import type { ArchiveFieldDef } from "@/components/admin/employee-archive/ArchiveMultiSection";
import { archiveValidityStatusLabel } from "@/components/admin/employee-archive/archive-status-ui";
import { fetchInternalRelativeSnapshot } from "@/components/admin/employee-archive/internal-relative-snapshot";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { FormField, OptionToggle } from "@/components/admin/form-field";
import {
  adminFilterInputGroupClassName,
  adminFilterSearchableTriggerClassName,
  adminFormControlPlaceholderClassName,
  adminFormControlShellClassName,
  adminFormControlValueClassName,
} from "@/components/admin/form-control-styles";
import { OptionSelect } from "@/components/admin/option-select";
import {
  NoPermissionCard,
  PageHeader,
  PanelCard,
  PanelEmpty,
  PanelError,
  PanelLoading,
  PaginationBar,
} from "@/components/admin/page-shell";
import { SearchableDialogPicker } from "@/components/admin/searchable-dialog-picker";
import {
  SearchableSelect,
  formatCodeName,
  type SearchableSelectOption,
} from "@/components/admin/searchable-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  ARCHIVE_DATA_RESOURCES,
  getArchiveDataResource,
  isArchiveDataResourcePath,
} from "@/config/archive-data-resources";
import { archiveSectionPermission } from "@/config/archive-permissions";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { usePermission } from "@/hooks/usePermission";
import { cn } from "@/lib/utils";

/** 批管列表行（各 resource 字段用索引扩展） */
type ArchiveDataItem = {
  id: string;
  employeeId: string;
  employeeNo: string;
  employeeName: string;
  organizationName?: string;
  [key: string]: unknown;
};

type LoadState =
  | { type: "loading" }
  | { type: "error"; error: ApiError }
  | { type: "ok"; items: ArchiveDataItem[]; total: number };

type SheetMode =
  | { type: "closed" }
  | { type: "new" }
  | { type: "edit"; item: ArchiveDataItem; editMode?: EmployeeAttendanceCardEditMode };

/** 与档案一致：每人一套生效版本链的批管资源 */
const VERSIONED_ARCHIVE_RESOURCES = new Set([
  "attendance-cards",
  "admin-infos",
  "accommodations",
]);

const VERSION_EDIT_MODE_OPTIONS = [
  { id: "CURRENT" as const, label: "修改当前版本" },
  { id: "NEW_VERSION" as const, label: "新增生效版本" },
];

function isVersionedArchiveResource(path: string | null | undefined): boolean {
  return path != null && VERSIONED_ARCHIVE_RESOURCES.has(path);
}

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type FilterState = {
  keyword: string;
  organizationId: string;
};

const EMPTY_FILTER: FilterState = { keyword: "", organizationId: "" };

type FormValues = Record<string, string>;

type DictOption = { value: string; label: string };

type DictBag = Record<string, DictOption[]>;

function emptyForm(fields: ArchiveFieldDef[]): FormValues {
  const form: FormValues = { employeeId: "", employeeNo: "" };
  for (const field of fields) {
    if (field.type === "boolean") {
      form[field.key] = "false";
    } else if (field.type === "toggle" && field.options?.length) {
      const preferNo =
        field.key === "takeShuttle" ||
        field.key === "parkingPermit" ||
        field.key === "hasAccommodation";
      const preferred = field.options.find((o) =>
        preferNo
          ? o.value === "NO"
          : o.value === "VALID" || o.value === "ACTIVE" || o.value === "YES",
      );
      form[field.key] = preferred?.value ?? field.options[0].value;
    } else if (field.type === "date" && field.key === "effectiveStartDate") {
      form[field.key] = todayStr();
    } else if (field.options?.length === 1) {
      form[field.key] = field.options[0].value;
    } else {
      form[field.key] = "";
    }
  }
  return form;
}

function itemToForm(fields: ArchiveFieldDef[], item: ArchiveDataItem): FormValues {
  const form = emptyForm(fields);
  form.employeeId = String(item.employeeId ?? "");
  form.employeeNo = String(item.employeeNo ?? "");
  for (const field of fields) {
    const raw = item[field.key];
    if (field.type === "boolean") {
      form[field.key] = raw === true || raw === "true" ? "true" : "false";
    } else if (field.sensitive && item[`${field.key}Masked`] === true) {
      form[field.key] = "";
    } else if (raw == null) {
      form[field.key] = "";
    } else {
      form[field.key] = String(raw);
    }
    if (field.displayKey && item[field.displayKey] != null) {
      form[field.displayKey] = String(item[field.displayKey]);
    }
  }
  if (item.relativeEmployeeNo || item.relativeEmployeeName) {
    form.__relativeEmployeeLabel = [item.relativeEmployeeNo, item.relativeEmployeeName]
      .filter(Boolean)
      .join(" — ");
  }
  return form;
}

function toEmployeeOption(item: Employee): SearchableSelectOption {
  const org = item.primaryOrganizationName?.trim();
  const position = item.primaryPositionName?.trim();
  const description = [org, position].filter(Boolean).join(" · ") || undefined;
  return {
    value: item.employeeNo,
    label: item.fullName,
    code: item.employeeNo,
    description,
    keywords: `${item.employeeNo} ${item.fullName} ${org ?? ""} ${position ?? ""}`,
  };
}

function toEmployeeIdOption(item: Employee): SearchableSelectOption {
  const base = toEmployeeOption(item);
  return { ...base, value: item.id };
}

function toApiError(e: unknown): ApiError {
  if (
    typeof e === "object" &&
    e !== null &&
    "message" in e &&
    typeof (e as { message: unknown }).message === "string"
  ) {
    return e as ApiError;
  }
  return { message: "请求失败，请稍后重试" };
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function CompactField(props: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("space-y-1", props.className)}>
      <div className="text-xs text-muted-foreground">{props.label}</div>
      {props.children}
    </div>
  );
}

function dictLabel(options: DictOption[] | undefined, value?: unknown): string {
  if (value == null || value === "") return "—";
  const code = String(value);
  return options?.find((o) => o.value === code)?.label ?? code;
}

/** 优先 *Label / field.options / 专用映射，避免误用空字典把 code 当作最终展示 */
function resolveCodedFieldLabel(
  item: ArchiveDataItem,
  key: string,
  value: unknown,
  field: ArchiveFieldDef | undefined,
  dictBag: DictBag,
): string {
  const code = value == null ? "" : String(value).trim();
  const fromApi = item[`${key}Label`];
  if (typeof fromApi === "string" && fromApi.trim()) return fromApi.trim();

  if (field?.options?.length) {
    const hit = field.options.find((o) => o.value === code);
    if (hit) return hit.label;
  }

  if (key === "status") {
    return archiveValidityStatusLabel(code);
  }

  if (field?.dictTypeCode) {
    const opts = dictBag[field.dictTypeCode];
    if (opts?.length) {
      const hit = opts.find((o) => o.value === code);
      if (hit) return hit.label;
    }
  }

  if (field?.dictKey) {
    const opts = dictBag[field.dictKey];
    if (opts?.length) {
      const hit = opts.find((o) => o.value === code);
      if (hit) return hit.label;
    }
  }

  return code || "—";
}

function cellText(
  item: ArchiveDataItem,
  key: string,
  dictBag: DictBag,
  fieldDefs: ArchiveFieldDef[],
  legalOptions: SearchableSelectOption[],
): React.ReactNode {
  const field = fieldDefs.find((f) => f.key === key);
  const value = item[key];

  if (key === "relativeEmployeeId") {
    const no = item.relativeEmployeeNo ? String(item.relativeEmployeeNo) : "";
    const name = item.relativeEmployeeName ? String(item.relativeEmployeeName) : "";
    if (!no && !name) return "—";
    return (
      <span>
        <span className="font-mono text-xs">{no}</span>
        {name ? <span className="ml-1">{name}</span> : null}
      </span>
    );
  }

  if (key === "legalEntityId") {
    const name = item.legalEntityName ? String(item.legalEntityName) : "";
    const code = item.legalEntityCode ? String(item.legalEntityCode) : "";
    if (name || code) return name || code;
    if (value == null || value === "") return "—";
    return legalOptions.find((o) => o.value === String(value))?.label ?? String(value);
  }

  if (key === "relation") {
    return resolveCodedFieldLabel(item, key, value, field, dictBag);
  }
  if (key === "countryRegion") {
    return dictLabel(dictBag.countryRegions, value);
  }
  if (key === "idType") {
    return dictLabel(dictBag.idTypes, value);
  }
  if (key === "employmentStatus") {
    return String(item.employmentStatusLabel ?? value ?? "—");
  }
  if (
    key === "status" ||
    key === "operationType" ||
    key === "contractCategory" ||
    key === "contractCategoryDesc" ||
    key === "agreementCategory"
  ) {
    if (key === "contractCategory" && item.contractCategoryLabel) {
      return String(item.contractCategoryLabel);
    }
    if (key === "contractCategoryDesc" && item.contractCategoryDescLabel) {
      return String(item.contractCategoryDescLabel);
    }
    return resolveCodedFieldLabel(item, key, value, field, dictBag);
  }

  if (typeof value === "boolean" || field?.type === "boolean") {
    return value === true || value === "true" ? "是" : "否";
  }

  // true/false toggle（主账户、公司代缴等）
  if (
    field?.type === "toggle" &&
    field.options?.every((opt) => opt.value === "true" || opt.value === "false")
  ) {
    return value === true || value === "true" ? "是" : "否";
  }

  if (field?.sensitive) {
    return (
      <span className="font-mono text-xs">
        {value == null || value === "" ? "—" : String(value)}
        {item[`${key}Masked`] === true ? (
          <Badge variant="secondary" className="ml-2">
            脱敏
          </Badge>
        ) : null}
      </span>
    );
  }

  // 其它带 options 的编码字段（兜底）
  if (field?.options?.length && value != null && value !== "") {
    const hit = field.options.find((o) => o.value === String(value).trim());
    if (hit) return hit.label;
  }

  if (field?.dictKey && value != null && value !== "") {
    return dictLabel(dictBag[field.dictKey], value);
  }

  if (value == null || value === "") return "—";
  return String(value);
}

export function AdminArchiveDataPage() {
  const navigate = useNavigate();
  const { resource: resourceParam } = useParams<{ resource: string }>();
  const resource = resourceParam && isArchiveDataResourcePath(resourceParam) ? resourceParam : null;
  const def = resource ? getArchiveDataResource(resource) : undefined;
  const perm = usePermission();

  const switchResources = useMemo(
    () =>
      ARCHIVE_DATA_RESOURCES.filter((r) =>
        perm.has(archiveSectionPermission(r.section, "view")),
      ),
    [perm],
  );

  const navigateToResource = useCallback(
    (path: string) => {
      navigate(`/admin/employees/data/${path}`);
    },
    [navigate],
  );

  const canView = def
    ? perm.has(archiveSectionPermission(def.section, "view")) || perm.has("employee:roster:view")
    : false;
  const canCreate = def
    ? perm.has(archiveSectionPermission(def.section, "create")) ||
      perm.has(archiveSectionPermission(def.section, "edit")) ||
      perm.has("employee:edit")
    : false;
  const canEdit = def
    ? perm.has(archiveSectionPermission(def.section, "edit")) || perm.has("employee:edit")
    : false;
  const canDelete = def
    ? perm.has(archiveSectionPermission(def.section, "delete")) ||
      perm.has(archiveSectionPermission(def.section, "edit")) ||
      perm.has("employee:edit")
    : false;
  const canImport = def
    ? perm.has(archiveSectionPermission(def.section, "import")) ||
      perm.has(archiveSectionPermission(def.section, "edit")) ||
      perm.has("employee:edit") ||
      perm.has("employee:roster:import")
    : false;
  const canExport = def
    ? perm.has(archiveSectionPermission(def.section, "export")) || perm.has("employee:export")
    : false;

  const [filter, setFilter] = useState<FilterState>(EMPTY_FILTER);
  const debouncedKeyword = useDebouncedValue(filter.keyword, 280);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [state, setState] = useState<LoadState>({ type: "loading" });
  const [sheet, setSheet] = useState<SheetMode>({ type: "closed" });
  const [form, setForm] = useState<FormValues>({});
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ArchiveDataItem | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [relativeLoading, setRelativeLoading] = useState(false);

  const [orgOptions, setOrgOptions] = useState<SearchableSelectOption[]>([]);
  const [legalOptions, setLegalOptions] = useState<SearchableSelectOption[]>([]);
  const [dictBag, setDictBag] = useState<DictBag>({});
  const [parentChildParents, setParentChildParents] = useState<Record<string, DictOption[]>>({});
  const [parentChildChildren, setParentChildChildren] = useState<DictOption[]>([]);
  const [employeeOptions, setEmployeeOptions] = useState<SearchableSelectOption[]>([]);
  const [selectedEmployeeOption, setSelectedEmployeeOption] = useState<SearchableSelectOption | null>(
    null,
  );
  const [relativeOptions, setRelativeOptions] = useState<SearchableSelectOption[]>([]);
  const [selectedRelativeOption, setSelectedRelativeOption] = useState<SearchableSelectOption | null>(
    null,
  );
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [relativeSearch, setRelativeSearch] = useState("");
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [relativeSearchLoading, setRelativeSearchLoading] = useState(false);
  const debouncedEmployeeSearch = useDebouncedValue(employeeSearch, 280);
  const debouncedRelativeSearch = useDebouncedValue(relativeSearch, 280);

  const needsRelativePicker = useMemo(
    () => (def?.formFields ?? []).some((f) => f.reference === "employee"),
    [def?.formFields],
  );
  const needsLegalEntity = useMemo(
    () => (def?.formFields ?? []).some((f) => f.reference === "legalEntity"),
    [def?.formFields],
  );

  const employeePickerOptions = useMemo(() => {
    const byValue = new Map<string, SearchableSelectOption>();
    if (selectedEmployeeOption) byValue.set(selectedEmployeeOption.value, selectedEmployeeOption);
    for (const opt of employeeOptions) byValue.set(opt.value, opt);
    return [...byValue.values()];
  }, [employeeOptions, selectedEmployeeOption]);

  const relativePickerOptions = useMemo(() => {
    const byValue = new Map<string, SearchableSelectOption>();
    if (selectedRelativeOption) byValue.set(selectedRelativeOption.value, selectedRelativeOption);
    for (const opt of relativeOptions) byValue.set(opt.value, opt);
    return [...byValue.values()];
  }, [relativeOptions, selectedRelativeOption]);

  const load = useCallback(async () => {
    if (!resource || !def?.supported) return;
    setState({ type: "loading" });
    try {
      const res = await listArchiveData(resource, {
        page,
        pageSize,
        keyword: debouncedKeyword || undefined,
        organizationId: filter.organizationId || undefined,
      });
      setState({
        type: "ok",
        items: (res.data?.items ?? []) as ArchiveDataItem[],
        total: res.data?.total ?? 0,
      });
    } catch (e) {
      setState({ type: "error", error: toApiError(e) });
    }
  }, [resource, def?.supported, page, pageSize, debouncedKeyword, filter.organizationId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
    setSheet({ type: "closed" });
    setDeleteTarget(null);
  }, [debouncedKeyword, filter.organizationId, resource]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [orgRes, formRes] = await Promise.all([
          getOrganizationTree(),
          getEmployeeFormOptions(),
        ]);
        if (cancelled) return;
        const flat = flattenOrgTree(orgRes.data as OrganizationTreeNode[]);
        setOrgOptions(
          flat.map((o) => ({
            value: o.id,
            label: o.name,
            keywords: [o.code, o.name].filter(Boolean).join(" "),
          })),
        );
        const data = formRes.data;
        setDictBag((prev) => ({
          ...prev,
          countryRegions: data?.countryRegions ?? [],
          idTypes: data?.idTypes ?? [],
          employeeRelations: data?.employeeRelations ?? [],
          bankAccountTypes: data?.bankAccountTypes ?? [],
          bankIds: data?.bankIds ?? [],
          branchIds: data?.branchIds ?? [],
          currencies: data?.currencies ?? [],
          payrollCompanies: data?.payrollCompanies ?? [],
          insuranceRegions: data?.insuranceRegions ?? [],
          workEnvironments: data?.workEnvironments ?? [],
        }));
      } catch {
        // 筛选项失败不阻断列表
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!needsLegalEntity) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await listLegalEntities({ page: 1, pageSize: 200 });
        if (cancelled) return;
        setLegalOptions(
          res.data.items.map((e) => ({
            value: e.id,
            label: e.name,
            code: e.code,
            keywords: [e.code, e.name].filter(Boolean).join(" "),
          })),
        );
      } catch {
        if (!cancelled) setLegalOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [needsLegalEntity]);

  useEffect(() => {
    if (!def?.formFields) return;
    const typeCodes = [
      ...new Set(
        def.formFields
          .map((f) => f.dictTypeCode)
          .filter((code): code is string => Boolean(code)),
      ),
    ];
    if (typeCodes.length === 0) return;
    let cancelled = false;
    void (async () => {
      try {
        const pairs = await Promise.all(
          typeCodes.map(async (code) => {
            const res = await listDictItemsByTypeCode(code);
            return [
              code,
              res.data
                .filter((i) => i.status === "ACTIVE")
                .sort((a, b) => a.sort - b.sort)
                .map((i) => ({ value: i.value, label: i.label })),
            ] as const;
          }),
        );
        if (cancelled) return;
        setDictBag((prev) => {
          const next = { ...prev };
          for (const [code, options] of pairs) next[code] = options;
          return next;
        });
      } catch {
        // 字典失败不阻断
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [def?.formFields, resource]);

  useEffect(() => {
    if (!def?.formFields) return;
    const parentTypes = [
      ...new Set(
        def.formFields
          .filter((f) => f.parentChildType && !f.parentFieldKey)
          .map((f) => f.parentChildType!)
      ),
    ];
    if (parentTypes.length === 0) return;
    let cancelled = false;
    void (async () => {
      try {
        const pairs = await Promise.all(
          parentTypes.map(async (typeCode) => {
            const res = await listParentsByType(typeCode);
            return [
              typeCode,
              res.data.map((p) => ({ value: p.code, label: p.name })),
            ] as const;
          }),
        );
        if (cancelled) return;
        const map: Record<string, DictOption[]> = {};
        for (const [code, options] of pairs) map[code] = options;
        setParentChildParents(map);
      } catch {
        if (!cancelled) setParentChildParents({});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [def?.formFields, resource]);

  const contractParentCode = form.contractCategory?.trim() ?? "";

  useEffect(() => {
    if (!def?.formFields || sheet.type === "closed") return;
    const childField = def.formFields.find((f) => f.parentChildType && f.parentFieldKey);
    if (!childField?.parentChildType || !childField.parentFieldKey) {
      setParentChildChildren([]);
      return;
    }
    const parentCode = (form[childField.parentFieldKey] ?? "").trim();
    if (!parentCode) {
      setParentChildChildren([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await listChildrenByParent(childField.parentChildType!, parentCode);
        if (cancelled) return;
        setParentChildChildren(res.data.map((c) => ({ value: c.code, label: c.name })));
      } catch {
        if (!cancelled) setParentChildChildren([]);
      }
    })();
    return () => {
      cancelled = true;
    };
    // 仅在父级类别变化时重载二级选项
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [def?.formFields, sheet.type, contractParentCode]);

  useEffect(() => {
    if (sheet.type !== "new") return;
    setEmployeeLoading(true);
    void listEmployees({
      page: 1,
      pageSize: 20,
      keyword: debouncedEmployeeSearch || undefined,
    })
      .then((res) => {
        setEmployeeOptions((res.data?.items ?? []).map(toEmployeeOption));
      })
      .catch(() => setEmployeeOptions([]))
      .finally(() => setEmployeeLoading(false));
  }, [sheet.type, debouncedEmployeeSearch]);

  useEffect(() => {
    if (sheet.type === "closed" || !needsRelativePicker) return;
    setRelativeSearchLoading(true);
    void listEmployees({
      page: 1,
      pageSize: 20,
      keyword: debouncedRelativeSearch || undefined,
    })
      .then((res) => {
        setRelativeOptions((res.data?.items ?? []).map(toEmployeeIdOption));
      })
      .catch(() => setRelativeOptions([]))
      .finally(() => setRelativeSearchLoading(false));
  }, [sheet.type, needsRelativePicker, debouncedRelativeSearch]);

  function openNew() {
    if (!def) return;
    setForm(emptyForm(def.formFields));
    setEmployeeSearch("");
    setRelativeSearch("");
    setEmployeeOptions([]);
    setRelativeOptions([]);
    setSelectedEmployeeOption(null);
    setSelectedRelativeOption(null);
    setSheet({ type: "new" });
  }

  function openEdit(item: ArchiveDataItem) {
    if (!def) return;
    const next = itemToForm(def.formFields, item);
    setForm(next);
    setEmployeeSearch("");
    setRelativeSearch("");
    setEmployeeOptions([]);
    setRelativeOptions([]);
    setSelectedEmployeeOption(null);
    if (item.relativeEmployeeId) {
      setSelectedRelativeOption({
        value: String(item.relativeEmployeeId),
        label: String(item.relativeEmployeeName ?? ""),
        code: String(item.relativeEmployeeNo ?? ""),
        keywords: `${item.relativeEmployeeNo ?? ""} ${item.relativeEmployeeName ?? ""}`,
      });
    } else {
      setSelectedRelativeOption(null);
    }
    setSheet({
      type: "edit",
      item,
      editMode: isVersionedArchiveResource(resource) ? "CURRENT" : undefined,
    });
  }

  function handleVersionEditModeChange(mode: EmployeeAttendanceCardEditMode) {
    if (sheet.type !== "edit" || !isVersionedArchiveResource(resource)) return;
    const base = itemToForm(def?.formFields ?? [], sheet.item);
    if (mode === "CURRENT") {
      base.effectiveStartDate = String(sheet.item.effectiveStartDate ?? todayStr());
    } else {
      base.effectiveStartDate = todayStr();
    }
    setForm(base);
    setSheet({ type: "edit", item: sheet.item, editMode: mode });
  }

  function closeSheet() {
    setSheet({ type: "closed" });
    setEmployeeSearch("");
    setRelativeSearch("");
    setEmployeeOptions([]);
    setRelativeOptions([]);
    setSelectedEmployeeOption(null);
    setSelectedRelativeOption(null);
  }

  async function handleRelativeSelect(relativeEmployeeId: string) {
    if (!relativeEmployeeId) {
      setSelectedRelativeOption(null);
      setForm((prev) => ({
        ...prev,
        relativeEmployeeId: "",
        __relativeEmployeeLabel: "",
        departmentName: "",
        positionName: "",
        jobGradeName: "",
        hireDate: "",
        employmentStatus: "",
        employmentStatusLabel: "",
        lastWorkDay: "",
      }));
      return;
    }
    const selected = relativePickerOptions.find((o) => o.value === relativeEmployeeId) ?? null;
    setSelectedRelativeOption(selected);
    setForm((prev) => ({
      ...prev,
      relativeEmployeeId,
      __relativeEmployeeLabel: selected
        ? `${selected.code} — ${selected.label}`
        : prev.__relativeEmployeeLabel,
    }));
    setRelativeLoading(true);
    try {
      const snapshot = await fetchInternalRelativeSnapshot(relativeEmployeeId);
      setForm((prev) => ({
        ...prev,
        relativeEmployeeId,
        departmentName: snapshot.departmentName,
        positionName: snapshot.positionName,
        jobGradeName: snapshot.jobGradeName,
        hireDate: snapshot.hireDate,
        employmentStatus: snapshot.employmentStatus,
        employmentStatusLabel: snapshot.employmentStatusLabel,
        lastWorkDay: snapshot.lastWorkDay,
      }));
    } catch (e) {
      toast.error(toApiError(e).message);
    } finally {
      setRelativeLoading(false);
    }
  }

  function buildPayload(): Record<string, unknown> {
    if (!def) return {};
    const payload: Record<string, unknown> = {
      employeeNo: form.employeeNo || undefined,
    };
    for (const field of def.formFields) {
      if (field.readOnly && field.reference !== "employee") {
        const v = form[field.key]?.trim() ?? "";
        if (v) payload[field.key] = v;
        continue;
      }
      if (field.type === "boolean") {
        payload[field.key] = form[field.key] === "true";
        continue;
      }
      if (field.type === "toggle") {
        const raw = form[field.key]?.trim() ?? "";
        const isBoolToggle =
          field.key === "isPrimary" ||
          field.key === "isCompanyPayroll" ||
          field.options?.every((opt) => opt.value === "true" || opt.value === "false");
        if (isBoolToggle) {
          payload[field.key] = raw === "true";
        } else if (raw) {
          payload[field.key] = raw;
        }
        continue;
      }
      if (field.type === "number") {
        const v = form[field.key]?.trim() ?? "";
        if (v) payload[field.key] = Number(v);
        continue;
      }
      if (field.sensitive) {
        const v = form[field.key]?.trim() ?? "";
        if (v) {
          payload[field.key] = v;
          payload[`${field.key}Masked`] = false;
        }
        continue;
      }
      const v = form[field.key]?.trim() ?? "";
      if (v) payload[field.key] = v;
    }
    if (isVersionedArchiveResource(resource) && sheet.type === "edit" && sheet.editMode) {
      payload.editMode = sheet.editMode;
    }
    return payload;
  }

  async function handleSave() {
    if (!resource || !def?.supported) return;
    if (sheet.type === "new" && !form.employeeNo?.trim()) {
      toast.error("请选择员工");
      return;
    }
    for (const field of def.formFields) {
      if (!field.required || field.readOnly) continue;
      if (field.type === "boolean") continue;
      // 编辑时脱敏敏感字段留空表示不改，跳过必填校验
      if (field.sensitive && sheet.type === "edit") continue;
      if (!(form[field.key]?.trim())) {
        toast.error(`请填写${field.label}`);
        return;
      }
    }
    if (resource === "id-documents" && sheet.type === "edit" && !(form.idNumber?.trim())) {
      toast.error("编辑时请重新填写证件号码（脱敏值不可提交）");
      return;
    }
    setSaving(true);
    try {
      const payload = buildPayload();
      if (sheet.type === "new") {
        await createArchiveData(resource, payload);
        toast.success(`已新建${def.title}`);
      } else if (sheet.type === "edit") {
        await updateArchiveData(resource, sheet.item.id, payload);
        toast.success(`已更新${def.title}`);
      }
      closeSheet();
      await load();
    } catch (e) {
      toast.error(toApiError(e).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!resource || !deleteTarget) return;
    try {
      await deleteArchiveData(resource, deleteTarget.id);
      toast.success("已删除");
      setDeleteTarget(null);
      await load();
    } catch (e) {
      toast.error(toApiError(e).message);
    }
  }

  async function handleExport() {
    if (!resource) return;
    setExporting(true);
    try {
      const blob = await exportArchiveData(resource, {
        keyword: debouncedKeyword || undefined,
        organizationId: filter.organizationId || undefined,
      });
      downloadBlob(blob, `${resource}-export.xlsx`);
      toast.success("导出成功");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "导出失败");
    } finally {
      setExporting(false);
    }
  }

  function renderFieldControl(field: ArchiveFieldDef) {
    if (field.readOnly) {
      const display =
        field.displayKey && form[field.displayKey]
          ? form[field.displayKey]
          : (form[field.key] ?? "");
      return <Input value={display || "—"} disabled />;
    }

    if (field.reference === "employee") {
      return (
        <SearchableDialogPicker
          value={form.relativeEmployeeId ?? ""}
          onChange={(id) => void handleRelativeSelect(id)}
          options={relativePickerOptions}
          dialogTitle="选择关联员工"
          dialogDescription="输入员工姓名或工号搜索，点击条目完成选择"
          placeholder="点击搜索选择关联员工"
          entityEmptyTitle="点击搜索选择关联员工"
          entityEmptyHint="在弹窗中搜索员工姓名或工号"
          entitySelectedHint="已选择关联员工，点击可重新搜索"
          searchPlaceholder="搜索员工姓名 / 工号…"
          entityIcon="briefcase"
          formatOption={formatCodeName}
          loading={relativeSearchLoading || relativeLoading}
          shouldFilter={false}
          onSearchChange={setRelativeSearch}
          helperText="none"
          className="w-full"
        />
      );
    }

    if (field.reference === "legalEntity") {
      return (
        <SearchableSelect
          value={form[field.key] ?? ""}
          onChange={(v) => setForm((f) => ({ ...f, [field.key]: v }))}
          options={legalOptions}
          placeholder="请选择法人"
          searchPlaceholder="搜索法人编码 / 名称…"
          allowEmpty={!field.required}
          emptyLabel="不指定"
          formatOption={formatCodeName}
          className="w-full"
        />
      );
    }

    if (field.parentChildType) {
      const options = field.parentFieldKey
        ? parentChildChildren
        : (parentChildParents[field.parentChildType] ?? []);
      const parentMissing = Boolean(field.parentFieldKey && !(form[field.parentFieldKey]?.trim()));
      return (
        <OptionSelect
          value={form[field.key] ?? ""}
          onValueChange={(v) => {
            setForm((f) => {
              const next = { ...f, [field.key]: v };
              if (!field.parentFieldKey) {
                for (const child of def?.formFields ?? []) {
                  if (child.parentFieldKey === field.key) next[child.key] = "";
                }
              }
              return next;
            });
          }}
          options={options}
          placeholder={parentMissing ? "请先选择上级类别" : "请选择"}
          allowEmpty={!field.required}
          emptyLabel="不指定"
          disabled={parentMissing || options.length === 0}
        />
      );
    }

    if (field.dictTypeCode) {
      const options = dictBag[field.dictTypeCode] ?? [];
      return (
        <OptionSelect
          value={form[field.key] ?? ""}
          onValueChange={(v) => setForm((f) => ({ ...f, [field.key]: v }))}
          options={options}
          placeholder="请选择"
          allowEmpty={!field.required}
          emptyLabel="不指定"
        />
      );
    }

    if (field.dictKey) {
      const options = dictBag[field.dictKey] ?? [];
      return (
        <OptionSelect
          value={form[field.key] ?? ""}
          onValueChange={(v) => setForm((f) => ({ ...f, [field.key]: v }))}
          options={options}
          placeholder="请选择"
          allowEmpty={!field.required}
          emptyLabel="不指定"
        />
      );
    }

    if (field.type === "boolean" || field.type === "toggle") {
      const options = (field.options ?? []).map((o) => ({ id: o.value, label: o.label }));
      return (
        <OptionToggle
          options={
            options.length
              ? options
              : [
                  { id: "true", label: "是" },
                  { id: "false", label: "否" },
                ]
          }
          value={form[field.key] || options[0]?.id || "false"}
          onChange={(v) => setForm((f) => ({ ...f, [field.key]: v }))}
        />
      );
    }

    if (field.options) {
      return (
        <OptionSelect
          value={form[field.key] ?? ""}
          onValueChange={(v) => setForm((f) => ({ ...f, [field.key]: v }))}
          options={field.options}
          placeholder="请选择"
          allowEmpty={!field.required}
          emptyLabel="不指定"
        />
      );
    }

    if (field.type === "textarea") {
      return (
        <Textarea
          value={form[field.key] ?? ""}
          className={cn(
            adminFormControlShellClassName({ empty: !form[field.key]?.trim() }),
            "min-h-20 shadow-none",
            !form[field.key]?.trim() && adminFormControlPlaceholderClassName,
            form[field.key]?.trim() && adminFormControlValueClassName,
          )}
          onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
        />
      );
    }

    const lockVersionStart =
      isVersionedArchiveResource(resource) &&
      field.key === "effectiveStartDate" &&
      sheet.type === "edit" &&
      sheet.editMode === "CURRENT";

    return (
      <Input
        type={field.type === "date" ? "date" : field.type === "number" ? "number" : "text"}
        value={form[field.key] ?? ""}
        disabled={lockVersionStart}
        placeholder={
          field.sensitive && sheet.type === "edit" ? "请输入明文后保存" : field.placeholder
        }
        onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
      />
    );
  }

  const title = def?.title ?? "管理数据";
  const activeFilterCount = [filter.keyword, filter.organizationId].filter(Boolean).length;

  if (!resource || !def) {
    return (
      <div className="space-y-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-fit px-2 text-muted-foreground"
          onClick={() => navigate("/admin/employees/data")}
        >
          返回管理数据目录
        </Button>
        <NoPermissionCard
          icon={<Shield className="size-8 text-muted-foreground" />}
          title="未知数据对象"
          description="请从组织与员工 › 员工主数据 › 管理数据 选择合法入口"
        />
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="space-y-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-fit px-2 text-muted-foreground"
          onClick={() => navigate("/admin/employees/data")}
        >
          返回管理数据目录
        </Button>
        <NoPermissionCard
          icon={<Shield className="size-8 text-muted-foreground" />}
          title={title}
          description={`需要 ${archiveSectionPermission(def.section, "view")} 权限`}
        />
      </div>
    );
  }

  if (!def.supported) {
    return (
      <div className="space-y-4">
        <ArchiveDataPageChrome
          currentPath={resource}
          currentTitle={title}
          description={def.description || "该数据对象的批量管理能力建设中"}
          resources={switchResources}
          onBackToHub={() => navigate("/admin/employees/data")}
          onSelectResource={navigateToResource}
        />
        <PanelCard>
          <PanelEmpty
            icon={<Inbox className="size-8 text-muted-foreground" />}
            title="能力建设中"
            description="路由已就绪。接入步骤见 docs/档案数据批管开发模板.md（参考证件信息）。"
          />
        </PanelCard>
      </div>
    );
  }

  const employeeField = def.formFields.find((f) => f.reference === "employee");
  const snapshotFields = def.formFields.filter((f) => f.readOnly);
  const editableFields = def.formFields.filter(
    (f) => f !== employeeField && !f.readOnly,
  );

  return (
    <div className="space-y-4">
      <ArchiveDataPageChrome
        currentPath={resource}
        currentTitle={title}
        description={def.description}
        resources={switchResources}
        onBackToHub={() => navigate("/admin/employees/data")}
        onSelectResource={navigateToResource}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {canImport ? (
              <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
                <Upload className="size-4" />
                导入
              </Button>
            ) : null}
            {canExport ? (
              <Button variant="outline" size="sm" disabled={exporting} onClick={() => void handleExport()}>
                <Download className="size-4" />
                {exporting ? "导出中…" : "导出"}
              </Button>
            ) : null}
            {canCreate ? (
              <Button size="sm" onClick={openNew}>
                <Plus className="size-4" />
                新建
              </Button>
            ) : null}
          </div>
        }
      />

      <PanelCard className="space-y-3 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <CompactField label="关键词" className="min-w-[220px] flex-1">
            <InputGroup className={adminFilterInputGroupClassName({ empty: !filter.keyword.trim() })}>
              <InputGroupAddon className="pl-2.5">
                <Search className="size-3.5 opacity-50" />
              </InputGroupAddon>
              <InputGroupInput
                placeholder="工号 / 姓名"
                value={filter.keyword}
                onChange={(e) => setFilter((f) => ({ ...f, keyword: e.target.value }))}
                className={cn(
                  "h-8 !text-sm",
                  filter.keyword.trim()
                    ? "font-medium text-foreground"
                    : "font-normal text-muted-foreground",
                )}
              />
            </InputGroup>
          </CompactField>
          <CompactField label="部门" className="min-w-[220px] flex-1">
            <SearchableSelect
              value={filter.organizationId}
              onChange={(organizationId) => setFilter((f) => ({ ...f, organizationId }))}
              options={orgOptions}
              placeholder="全部部门"
              searchPlaceholder="搜索部门编码 / 名称…"
              allowEmpty
              emptyLabel="全部部门"
              className={adminFilterSearchableTriggerClassName}
            />
          </CompactField>
          <Button
            variant="ghost"
            size="sm"
            disabled={activeFilterCount === 0}
            onClick={() => setFilter(EMPTY_FILTER)}
          >
            <RotateCcw className="size-4" />
            重置
          </Button>
        </div>
      </PanelCard>

      <PanelCard className="overflow-hidden p-0">
        {state.type === "loading" ? <PanelLoading message={`加载${title}…`} /> : null}
        {state.type === "error" ? (
          <PanelError error={state.error} onRetry={() => void load()} />
        ) : null}
        {state.type === "ok" && state.items.length === 0 ? (
          <PanelEmpty
            icon={<Inbox className="size-8 text-muted-foreground" />}
            title={`暂无${title}`}
            description="可通过新建或 Excel 导入维护"
          />
        ) : null}
        {state.type === "ok" && state.items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                <tr>
                  {def.listColumns.map((col) => (
                    <th key={col.key} className="px-4 py-3 font-medium">
                      {col.label}
                    </th>
                  ))}
                  <th className="px-4 py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {state.items.map((item) => (
                  <tr key={item.id} className="border-b last:border-0 hover:bg-muted/30">
                    {def.listColumns.map((col) => (
                      <td key={col.key} className="px-4 py-3">
                        {col.key === "employeeNo" ? (
                          <span className="font-mono text-xs">{String(item.employeeNo ?? "—")}</span>
                        ) : col.key === "employeeName" ? (
                          String(item.employeeName ?? "—")
                        ) : col.key === "organizationName" ? (
                          <span className="text-muted-foreground">
                            {String(item.organizationName || "—")}
                          </span>
                        ) : (
                          cellText(item, col.key, dictBag, def.formFields, legalOptions)
                        )}
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {canEdit ? (
                          <Button variant="ghost" size="sm" onClick={() => openEdit(item)}>
                            <Pencil className="size-3.5" />
                          </Button>
                        ) : null}
                        {canDelete ? (
                          <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(item)}>
                            <Trash2 className="size-3.5 text-destructive" />
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        {state.type === "ok" ? (
          <PaginationBar
            page={page}
            pageSize={pageSize}
            total={state.total}
            itemCount={state.items.length}
            onPrev={() => setPage((p) => Math.max(1, p - 1))}
            onNext={() => setPage((p) => p + 1)}
          />
        ) : null}
      </PanelCard>

      <Sheet open={sheet.type !== "closed"} onOpenChange={(open) => !open && closeSheet()}>
        <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
          <SheetHeader className="border-b px-6 py-4">
            <SheetTitle>
              {sheet.type === "edit"
                ? isVersionedArchiveResource(resource) && sheet.editMode === "NEW_VERSION"
                  ? `新增${title}生效版本`
                  : `编辑${title}`
                : `新建${title}`}
            </SheetTitle>
            <SheetDescription>
              {isVersionedArchiveResource(resource)
                ? `规则与员工档案「${title}」一致：每人一套版本链，新增生效版本会自动衔接失效日期`
                : `规则与员工档案「${title}」分区一致`}
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
            {sheet.type === "new" ? (
              <FormField label="员工" required>
                <SearchableDialogPicker
                  value={form.employeeNo ?? ""}
                  onChange={(employeeNo) => {
                    const opt = employeePickerOptions.find((o) => o.value === employeeNo) ?? null;
                    setSelectedEmployeeOption(opt);
                    setForm((f) => ({
                      ...f,
                      employeeNo,
                      employeeId: "",
                    }));
                  }}
                  options={employeePickerOptions}
                  dialogTitle="选择员工"
                  dialogDescription="输入员工姓名或工号搜索，点击条目完成选择"
                  placeholder="点击搜索选择员工"
                  entityEmptyTitle="点击搜索选择员工"
                  entityEmptyHint="在弹窗中搜索员工姓名或工号"
                  entitySelectedHint="已选择员工，点击可重新搜索"
                  searchPlaceholder="搜索员工姓名 / 工号…"
                  entityIcon="briefcase"
                  formatOption={formatCodeName}
                  loading={employeeLoading}
                  shouldFilter={false}
                  onSearchChange={setEmployeeSearch}
                  helperText="none"
                  className="w-full"
                />
              </FormField>
            ) : (
              <FormField label="员工">
                <Input
                  value={
                    form.employeeNo
                      ? `${form.employeeNo}${
                          sheet.type === "edit" ? ` — ${String(sheet.item.employeeName ?? "")}` : ""
                        }`
                      : ""
                  }
                  disabled
                />
              </FormField>
            )}

            {isVersionedArchiveResource(resource) && sheet.type === "edit" ? (
              <FormField label="修改方式" required>
                <OptionToggle
                  options={VERSION_EDIT_MODE_OPTIONS}
                  value={sheet.editMode ?? "CURRENT"}
                  onChange={(v) => handleVersionEditModeChange(v as EmployeeAttendanceCardEditMode)}
                />
              </FormField>
            ) : null}

            {employeeField ? (
              <FormField label={employeeField.label} required={employeeField.required}>
                <div className="space-y-2">
                  {renderFieldControl(employeeField)}
                  {form.relativeEmployeeId ? (
                    <div className="flex items-center gap-2 rounded-lg border border-primary/15 bg-primary/5 px-3 py-2 text-xs text-primary">
                      <UserRound className="size-3.5 shrink-0" />
                      <span>
                        {relativeLoading
                          ? "正在同步任职信息…"
                          : "下方任职快照将随关联员工自动更新"}
                      </span>
                    </div>
                  ) : null}
                </div>
              </FormField>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              {editableFields.map((field) => (
                <div
                  key={field.key}
                  className={field.type === "textarea" ? "sm:col-span-2" : undefined}
                >
                  <FormField label={field.label} required={field.required}>
                    {renderFieldControl(field)}
                  </FormField>
                </div>
              ))}
            </div>

            {employeeField && form.relativeEmployeeId && snapshotFields.length > 0 ? (
              <section className="overflow-hidden rounded-lg border border-border/80 bg-primary/[0.02]">
                <div className="border-b border-border/35 px-4 py-2.5">
                  <p className="text-xs font-medium text-muted-foreground">任职快照（自动带出）</p>
                </div>
                <div className="grid gap-4 p-4 sm:grid-cols-2">
                  {snapshotFields.map((field) => (
                    <FormField key={field.key} label={field.label}>
                      {renderFieldControl(field)}
                    </FormField>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
          <SheetFooter className="border-t px-6 py-4">
            <div className="flex w-full justify-end gap-2">
              <Button variant="outline" onClick={closeSheet}>
                取消
              </Button>
              <Button disabled={saving} onClick={() => void handleSave()}>
                {saving ? "保存中…" : "保存"}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={deleteTarget != null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`删除${title}`}
        description={
          deleteTarget
            ? `确认删除 ${String(deleteTarget.employeeName ?? "")}（${String(deleteTarget.employeeNo ?? "")}）的该条记录？`
            : ""
        }
        confirmLabel="删除"
        destructive
        onConfirm={() => void handleDelete()}
      />

      {resource && def.importConfig ? (
        <ArchiveDataImportDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          resource={resource}
          title={def.title}
          businessKeyHint={def.importConfig.businessKeyHint}
          fillHints={def.importConfig.fillHints}
          fillSubHint={def.importConfig.fillSubHint}
          templateSheetHint={def.importConfig.templateSheetHint}
          onImported={load}
        />
      ) : null}
    </div>
  );
}
