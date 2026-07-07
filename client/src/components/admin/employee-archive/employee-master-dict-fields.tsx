import { FormField } from "@/components/admin/form-field";
import { OptionSelect, type OptionSelectItem } from "@/components/admin/option-select";

type DictFieldSelectProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: OptionSelectItem[];
  loading?: boolean;
};

export function DictFieldSelect({
  label,
  value,
  onChange,
  options,
  loading,
}: DictFieldSelectProps) {
  return (
    <FormField label={label}>
      <OptionSelect
        value={value}
        onValueChange={onChange}
        options={options}
        allowEmpty
        emptyLabel="不填写"
        placeholder={loading ? "加载选项…" : "请选择"}
        disabled={loading}
        className="w-full"
      />
    </FormField>
  );
}
