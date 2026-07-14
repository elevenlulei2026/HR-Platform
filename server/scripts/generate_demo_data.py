#!/usr/bin/env python3
"""生成 V57 完整公司样例数据 SQL（法人 / 组织 / 岗位 / 花名册 / 档案）。

目标：星河数字科技集团，研发-生产-销售结构完整，员工不少于 520 人。
字段对齐当前库（至 V56）。
"""

from __future__ import annotations

import base64
import os
import random
from dataclasses import dataclass
from datetime import date, timedelta
from pathlib import Path

try:
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
except ImportError as exc:  # pragma: no cover
    raise SystemExit("请先安装 cryptography: pip install cryptography") from exc

CRYPTO_KEY_B64 = os.environ.get(
    "HR_CRYPTO_KEY", "MDEyMzQ1Njc4OUFCQ0RFRjAxMjM0NTY3ODlBQkNERUY="
)
PREFIX = "ENC:"

SURNAMES = list(
    "赵钱孙李周吴郑王冯陈褚卫蒋沈韩杨朱秦尤许何吕施张孔曹严华金魏陶姜戚谢邹喻柏水窦章云苏潘葛奚范彭郎鲁韦昌马苗凤花方俞任袁柳酆鲍史唐费廉岑薛雷贺倪汤滕殷罗毕郝邬安常乐于时傅皮卞齐康伍余元卜顾孟平黄和穆萧尹姚邵湛汪祁毛禹狄米贝明臧计伏成戴谈宋茅庞熊纪舒屈项祝董梁杜阮蓝闵席季麻强贾路娄危江童颜郭梅盛林刁钟徐邱骆高夏蔡田樊胡凌霍虞万支柯昝管卢莫经房裘缪干解应宗丁宣贲邓郁单杭洪包诸左石崔吉钮龚程嵇邢滑裴陆荣翁荀羊於惠甄曲家封芮羿储靳汲邴糜松井段富巫乌焦巴弓牧隗山谷车侯宓蓬全郗班仰秋仲伊宫宁仇栾暴甘钭厉戎祖武符刘景詹束龙叶幸司韶郜黎蓟薄印宿白怀蒲邰从鄂索咸籍赖卓蔺屠蒙池乔阴胥能苍双闻莘党翟谭贡劳逄姬申扶堵冉宰郦雍璩桑桂濮牛寿通边扈燕冀郏浦尚农温别庄晏柴瞿阎充慕连茹习宦艾鱼容向古易慎戈廖庾终暨居衡步都耿满弘匡国文寇广禄阙东欧殳沃利蔚越夔隆师巩聂晁勾敖融冷訾辛阚那简饶空曾毋沙乜养鞠须丰巢关蒯相查后荆红游竺权逯盖益桓公"
)
GIVEN_MALE = "伟强磊洋勇军杰涛明超华建国建华志强志明浩然子轩梓豪宇轩俊杰文博天佑嘉懿睿哲皓轩"
GIVEN_FEMALE = "芳娜敏静丽艳娟霞秀兰梅琳雪慧颖婷怡欣雨萱梓涵诗涵思涵梦琪佳怡欣怡语嫣若曦晓彤雅琪静雯"

LOC_ADDR = {
    "SHANGHAI": ("上海市浦东新区张江高科技园区碧波路 690 号", "上海市徐汇区漕河泾开发区桂平路 391 号"),
    "BEIJING": ("北京市海淀区中关村软件园二期", "北京市朝阳区望京街 10 号"),
    "SHENZHEN": ("深圳市南山区科技园南区高新南七道", "深圳市福田区深南大道 1001 号"),
    "CHENGDU": ("成都市高新区天府软件园 C 区", "成都市武侯区科华路 99 号"),
    "HANGZHOU": ("杭州市余杭区文一西路 969 号", "杭州市滨江区网商路 699 号"),
    "GUANGZHOU": ("广州市天河区珠江新城花城大道", "广州市黄埔区科学城开源大道"),
    "NANJING": ("南京市江宁区秣周东路", "南京市建邺区江东中路"),
    "SUZHOU": ("苏州市工业园区星湖街 328 号", "苏州市高新区科技城狮山路"),
}
WORK_LOC = {
    "SHANGHAI": "SH", "BEIJING": "BJ", "SHENZHEN": "SZ", "CHENGDU": "CD",
    "HANGZHOU": "SH", "GUANGZHOU": "SZ", "NANJING": "SH", "SUZHOU": "SH",
}
INSURANCE = {
    "SHANGHAI": "SH", "BEIJING": "BJ", "SHENZHEN": "SZ", "CHENGDU": "SZ",
    "HANGZHOU": "SH", "GUANGZHOU": "GZ", "NANJING": "SH", "SUZHOU": "SH",
}
SCHOOLS = [
    ("清华大学", "计算机科学与技术", "MASTER", "MASTER"),
    ("北京大学", "软件工程", "BACHELOR", "BACHELOR"),
    ("复旦大学", "信息管理与信息系统", "BACHELOR", "BACHELOR"),
    ("上海交通大学", "电子信息工程", "MASTER", "MASTER"),
    ("浙江大学", "人工智能", "MASTER", "MASTER"),
    ("南京大学", "数学与应用数学", "BACHELOR", "BACHELOR"),
    ("华中科技大学", "通信工程", "BACHELOR", "BACHELOR"),
    ("中山大学", "工商管理", "BACHELOR", "NONE"),
    ("同济大学", "机械工程", "BACHELOR", "BACHELOR"),
    ("西安交通大学", "自动化", "BACHELOR", "BACHELOR"),
    ("苏州大学", "材料科学与工程", "COLLEGE", "NONE"),
    ("哈尔滨工业大学", "机器人工程", "MASTER", "MASTER"),
]
COMPANIES_PREV = [
    "腾讯科技", "阿里巴巴", "字节跳动", "华为技术", "美团", "京东集团",
    "百度在线", "小米科技", "网易杭州", "拼多多", "蚂蚁集团", "联想集团",
]
BANK_PAIRS = [
    ("ICBC", "ICBC_SH"), ("ICBC", "ICBC_BJ"), ("CCB", "CCB_SH"),
    ("CCB", "CCB_BJ"), ("CMB", "CMB_SZ"), ("ABC", "ABC_GZ"),
]

rng = random.Random(20260714)


@dataclass
class OrgNode:
    code: str
    name: str
    parent: str | None
    org_type: str
    location: str
    legal: str
    level: str
    dept_type: str
    func: str
    attr: str = "PHYSICAL"
    headcount: int = 0


def encrypt(plain: str) -> str:
    key = base64.b64decode(CRYPTO_KEY_B64)
    aesgcm = AESGCM(key)
    iv = os.urandom(12)
    ct = aesgcm.encrypt(iv, plain.encode("utf-8"), None)
    return PREFIX + base64.b64encode(iv + ct).decode("ascii")


def esc(s: object | None) -> str:
    if s is None:
        return "NULL"
    return "'" + str(s).replace("\\", "\\\\").replace("'", "''") + "'"


def sql_date(d: date | None) -> str:
    return "NULL" if d is None else f"'{d.isoformat()}'"


def gen_id_card(birth: date, seq: int) -> str:
    area = "310115"
    birth_s = birth.strftime("%Y%m%d")
    base = f"{area}{birth_s}{seq % 1000:03d}"
    weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2]
    checks = "10X98765432"
    total = sum(int(base[i]) * weights[i] for i in range(17))
    return base + checks[total % 11]


def gen_mobile(seq: int) -> str:
    prefixes = ["138", "139", "186", "187", "158", "159", "176", "177"]
    return prefixes[seq % len(prefixes)] + f"{(10000000 + seq) % 100000000:08d}"


def gen_name(male: bool) -> str:
    surname = rng.choice(SURNAMES)
    pool = GIVEN_MALE if male else GIVEN_FEMALE
    given_len = 1 if rng.random() < 0.35 else 2
    given = "".join(rng.choice(pool) for _ in range(given_len))
    return surname + given


def nature_of(func: str) -> str:
    return {
        "RND": "RND",
        "MANUFACTURING": "PRODUCTION",
        "MARKET": "SALES",
        "FUNCTION": "MANAGEMENT",
    }.get(func, "MANAGEMENT")


def group_codes(func: str, is_prod_worker: bool) -> tuple[str, str]:
    if is_prod_worker:
        return "10", "1002"
    if func == "MARKET":
        return "10", "1001"
    if func == "FUNCTION":
        return "10", "1006"
    return "10", "1001"


def build_org_tree() -> list[OrgNode]:
    orgs: list[OrgNode] = []

    def add(**kwargs) -> None:
        orgs.append(OrgNode(**kwargs))

    add(
        code="20000001", name="星河数字科技集团", parent=None, org_type="COMPANY",
        location="SHANGHAI", legal="LE-DEFAULT", level="L1", dept_type="10",
        func="FUNCTION",
    )

    for code, name, loc, legal, func, dt in [
        ("20000101", "技术研发中心", "SHANGHAI", "LE-DEFAULT", "RND", "36"),
        ("20000102", "智能制造中心", "SUZHOU", "LE-DEFAULT", "MANUFACTURING", "10"),
        ("20000103", "销售与市场中心", "SHANGHAI", "LE-DEFAULT", "MARKET", "16"),
        ("20000104", "客户成功中心", "SHANGHAI", "LE-DEFAULT", "MARKET", "32"),
        ("20000105", "人力资源中心", "SHANGHAI", "LE-DEFAULT", "FUNCTION", "17"),
        ("20000106", "财务与行政中心", "SHANGHAI", "LE-DEFAULT", "FUNCTION", "18"),
        ("20000107", "信息技术中心", "SHANGHAI", "LE-DEFAULT", "RND", "19"),
        ("20000108", "供应链中心", "SUZHOU", "LE-DEFAULT", "MANUFACTURING", "27"),
        ("20000109", "质量管理中心", "SUZHOU", "LE-DEFAULT", "FUNCTION", "25"),
        ("20000110", "深圳研发中心", "SHENZHEN", "LE-STAR-SZ", "RND", "36"),
        ("20000111", "成都研发中心", "CHENGDU", "LE-STAR-CD", "RND", "36"),
        ("20000112", "法务合规中心", "BEIJING", "LE-DEFAULT", "FUNCTION", "22"),
    ]:
        add(
            code=code, name=name, parent="20000001", org_type="DIVISION",
            location=loc, legal=legal, level="L1", dept_type=dt, func=func,
        )

    # (code, name, parent, type, loc, legal, level, dept_type, func, headcount)
    nodes = [
        ("20000201", "平台研发部", "20000101", "DEPARTMENT", "SHANGHAI", "LE-DEFAULT", "L2", "36", "RND", 0),
        ("20000301", "平台后端组", "20000201", "TEAM", "SHANGHAI", "LE-DEFAULT", "L3", "36", "RND", 28),
        ("20000302", "平台前端组", "20000201", "TEAM", "SHANGHAI", "LE-DEFAULT", "L3", "36", "RND", 18),
        ("20000303", "基础架构组", "20000201", "TEAM", "SHANGHAI", "LE-DEFAULT", "L3", "36", "RND", 16),
        ("20000202", "业务研发部", "20000101", "DEPARTMENT", "SHANGHAI", "LE-DEFAULT", "L2", "36", "RND", 0),
        ("20000304", "HR SaaS 组", "20000202", "TEAM", "SHANGHAI", "LE-DEFAULT", "L3", "36", "RND", 22),
        ("20000305", "财务共享组", "20000202", "TEAM", "SHANGHAI", "LE-DEFAULT", "L3", "36", "RND", 14),
        ("20000306", "供应链系统组", "20000202", "TEAM", "SHANGHAI", "LE-DEFAULT", "L3", "36", "RND", 12),
        ("20000203", "质量保障部", "20000101", "DEPARTMENT", "SHANGHAI", "LE-DEFAULT", "L2", "25", "RND", 0),
        ("20000307", "测试工程组", "20000203", "TEAM", "SHANGHAI", "LE-DEFAULT", "L3", "25", "RND", 16),
        ("20000308", "效能工程组", "20000203", "TEAM", "SHANGHAI", "LE-DEFAULT", "L3", "25", "RND", 10),
        ("20000204", "数据智能部", "20000101", "DEPARTMENT", "SHANGHAI", "LE-DEFAULT", "L2", "40", "RND", 0),
        ("20000309", "数据仓库组", "20000204", "TEAM", "SHANGHAI", "LE-DEFAULT", "L3", "40", "RND", 12),
        ("20000310", "算法应用组", "20000204", "TEAM", "SHANGHAI", "LE-DEFAULT", "L3", "40", "RND", 14),
        ("20000210", "嵌入式研发部", "20000110", "DEPARTMENT", "SHENZHEN", "LE-STAR-SZ", "L2", "36", "RND", 0),
        ("20000311", "固件组", "20000210", "TEAM", "SHENZHEN", "LE-STAR-SZ", "L3", "36", "RND", 18),
        ("20000312", "硬件组", "20000210", "TEAM", "SHENZHEN", "LE-STAR-SZ", "L3", "23", "RND", 14),
        ("20000211", "算法工程部", "20000111", "DEPARTMENT", "CHENGDU", "LE-STAR-CD", "L2", "36", "RND", 0),
        ("20000313", "视觉算法组", "20000211", "TEAM", "CHENGDU", "LE-STAR-CD", "L3", "36", "RND", 16),
        ("20000314", "大数据平台组", "20000211", "TEAM", "CHENGDU", "LE-STAR-CD", "L3", "40", "RND", 16),
        ("20000220", "生产一部", "20000102", "DEPARTMENT", "SUZHOU", "LE-DEFAULT", "L2", "11", "MANUFACTURING", 0),
        ("20000320", "SMT 一线组", "20000220", "TEAM", "SUZHOU", "LE-DEFAULT", "L3", "11", "MANUFACTURING", 0),
        ("20000401", "SMT-A 线", "20000320", "TEAM", "SUZHOU", "LE-DEFAULT", "L4", "11", "MANUFACTURING", 28),
        ("20000402", "SMT-B 线", "20000320", "TEAM", "SUZHOU", "LE-DEFAULT", "L4", "11", "MANUFACTURING", 26),
        ("20000321", "组装一线组", "20000220", "TEAM", "SUZHOU", "LE-DEFAULT", "L3", "11", "MANUFACTURING", 0),
        ("20000403", "组装-A 班", "20000321", "TEAM", "SUZHOU", "LE-DEFAULT", "L4", "11", "MANUFACTURING", 30),
        ("20000404", "组装-B 班", "20000321", "TEAM", "SUZHOU", "LE-DEFAULT", "L4", "11", "MANUFACTURING", 28),
        ("20000221", "生产二部", "20000102", "DEPARTMENT", "SUZHOU", "LE-DEFAULT", "L2", "11", "MANUFACTURING", 0),
        ("20000322", "CNC 加工组", "20000221", "TEAM", "SUZHOU", "LE-DEFAULT", "L3", "11", "MANUFACTURING", 24),
        ("20000323", "注塑成型组", "20000221", "TEAM", "SUZHOU", "LE-DEFAULT", "L3", "11", "MANUFACTURING", 22),
        ("20000222", "工艺工程部", "20000102", "DEPARTMENT", "SUZHOU", "LE-DEFAULT", "L2", "23", "MANUFACTURING", 18),
        ("20000223", "设备工程部", "20000102", "DEPARTMENT", "SUZHOU", "LE-DEFAULT", "L2", "23", "MANUFACTURING", 16),
        ("20000230", "采购部", "20000108", "DEPARTMENT", "SUZHOU", "LE-DEFAULT", "L2", "24", "MANUFACTURING", 12),
        ("20000231", "仓储物流部", "20000108", "DEPARTMENT", "SUZHOU", "LE-DEFAULT", "L2", "27", "MANUFACTURING", 14),
        ("20000232", "计划物控部", "20000108", "DEPARTMENT", "SUZHOU", "LE-DEFAULT", "L2", "27", "MANUFACTURING", 10),
        ("20000240", "来料检验部", "20000109", "DEPARTMENT", "SUZHOU", "LE-DEFAULT", "L2", "25", "FUNCTION", 8),
        ("20000241", "过程质量部", "20000109", "DEPARTMENT", "SUZHOU", "LE-DEFAULT", "L2", "25", "FUNCTION", 8),
        ("20000242", "质量体系部", "20000109", "DEPARTMENT", "SUZHOU", "LE-DEFAULT", "L2", "25", "FUNCTION", 6),
        ("20000250", "华东销售部", "20000103", "DEPARTMENT", "SHANGHAI", "LE-DEFAULT", "L2", "16", "MARKET", 0),
        ("20000350", "上海销售一组", "20000250", "TEAM", "SHANGHAI", "LE-DEFAULT", "L3", "16", "MARKET", 14),
        ("20000351", "上海销售二组", "20000250", "TEAM", "SHANGHAI", "LE-DEFAULT", "L3", "16", "MARKET", 12),
        ("20000352", "苏州销售组", "20000250", "TEAM", "SUZHOU", "LE-DEFAULT", "L3", "16", "MARKET", 10),
        ("20000251", "华北销售部", "20000103", "DEPARTMENT", "BEIJING", "LE-DEFAULT", "L2", "16", "MARKET", 0),
        ("20000353", "北京销售一组", "20000251", "TEAM", "BEIJING", "LE-DEFAULT", "L3", "16", "MARKET", 12),
        ("20000354", "天津销售组", "20000251", "TEAM", "BEIJING", "LE-DEFAULT", "L3", "16", "MARKET", 8),
        ("20000252", "华南销售部", "20000103", "DEPARTMENT", "GUANGZHOU", "LE-DEFAULT", "L2", "16", "MARKET", 0),
        ("20000355", "广东销售组", "20000252", "TEAM", "GUANGZHOU", "LE-DEFAULT", "L3", "16", "MARKET", 12),
        ("20000356", "福建销售组", "20000252", "TEAM", "GUANGZHOU", "LE-DEFAULT", "L3", "16", "MARKET", 8),
        ("20000253", "大客户销售部", "20000103", "DEPARTMENT", "SHANGHAI", "LE-DEFAULT", "L2", "32", "MARKET", 10),
        ("20000254", "渠道销售部", "20000103", "DEPARTMENT", "SHANGHAI", "LE-DEFAULT", "L2", "16", "MARKET", 10),
        ("20000255", "市场营销部", "20000103", "DEPARTMENT", "SHANGHAI", "LE-DEFAULT", "L2", "14", "MARKET", 10),
        ("20000260", "实施交付部", "20000104", "DEPARTMENT", "SHANGHAI", "LE-DEFAULT", "L2", "21", "MARKET", 0),
        ("20000360", "华东实施组", "20000260", "TEAM", "SHANGHAI", "LE-DEFAULT", "L3", "21", "MARKET", 10),
        ("20000361", "华南实施组", "20000260", "TEAM", "GUANGZHOU", "LE-DEFAULT", "L3", "21", "MARKET", 8),
        ("20000261", "客户支持部", "20000104", "DEPARTMENT", "SHANGHAI", "LE-DEFAULT", "L2", "21", "MARKET", 12),
        ("20000270", "HR COE 部", "20000105", "DEPARTMENT", "SHANGHAI", "LE-DEFAULT", "L2", "17", "FUNCTION", 8),
        ("20000271", "HRBP 部", "20000105", "DEPARTMENT", "SHANGHAI", "LE-DEFAULT", "L2", "17", "FUNCTION", 10),
        ("20000272", "员工关系部", "20000105", "DEPARTMENT", "SHANGHAI", "LE-DEFAULT", "L2", "17", "FUNCTION", 6),
        ("20000280", "财务会计部", "20000106", "DEPARTMENT", "SHANGHAI", "LE-DEFAULT", "L2", "18", "FUNCTION", 10),
        ("20000281", "行政办公部", "20000106", "DEPARTMENT", "SHANGHAI", "LE-DEFAULT", "L2", "12", "FUNCTION", 8),
        ("20000290", "基础设施部", "20000107", "DEPARTMENT", "SHANGHAI", "LE-DEFAULT", "L2", "19", "RND", 8),
        ("20000291", "企业应用部", "20000107", "DEPARTMENT", "SHANGHAI", "LE-DEFAULT", "L2", "19", "RND", 8),
        ("20000292", "信息安全部", "20000107", "DEPARTMENT", "SHANGHAI", "LE-DEFAULT", "L2", "20", "FUNCTION", 6),
        ("20000370", "法务部", "20000112", "DEPARTMENT", "BEIJING", "LE-DEFAULT", "L2", "22", "FUNCTION", 5),
        ("20000371", "合规监察部", "20000112", "DEPARTMENT", "BEIJING", "LE-DEFAULT", "L2", "22", "FUNCTION", 4),
    ]
    for code, name, parent, otype, loc, legal, level, dt, func, hc in nodes:
        add(
            code=code, name=name, parent=parent, org_type=otype, location=loc,
            legal=legal, level=level, dept_type=dt, func=func, headcount=hc,
        )
    add(
        code="20000901", name="数字化转型项目组", parent="20000001", org_type="DEPARTMENT",
        location="SHANGHAI", legal="LE-DEFAULT", level="L2", dept_type="15",
        func="RND", attr="VIRTUAL", headcount=0,
    )
    return orgs


def position_profile(org: OrgNode, idx: int) -> dict:
    if org.org_type in ("COMPANY", "DIVISION") or idx == 0:
        return dict(
            cat="MANAGEMENT", kind="OFFICE", seq="M", level="10",
            key="YES", ident="MANAGEMENT", suffix="负责人",
            occ="NO",
        )
    if org.func == "MANUFACTURING":
        profiles = [
            dict(cat="DIRECT_WORKER", kind="NON_OFFICE", seq="T", level="3", key="NO", ident="DIRECT_PRODUCTION", suffix="操作员", occ="YES"),
            dict(cat="INDIRECT_WORKER", kind="NON_OFFICE", seq="T", level="5", key="NO", ident="DIRECT_SUPPORT", suffix="技术员", occ="NO"),
            dict(cat="MANAGEMENT", kind="OFFICE", seq="M", level="7", key="NO", ident="MANAGEMENT", suffix="主管", occ="NO"),
        ]
        return profiles[idx % len(profiles)]
    if org.func == "MARKET":
        profiles = [
            dict(cat="MANAGEMENT", kind="OFFICE", seq="M", level="8", key="NO", ident="MANAGEMENT", suffix="经理", occ="NO"),
            dict(cat="INDIRECT_WORKER", kind="OFFICE", seq="P", level="5", key="NO", ident="SALES_GUIDE", suffix="顾问", occ="NO"),
            dict(cat="INDIRECT_WORKER", kind="OFFICE", seq="P", level="4", key="NO", ident="INDIRECT", suffix="专员", occ="NO"),
        ]
        return profiles[idx % len(profiles)]
    profiles = [
        dict(cat="TECHNICAL", kind="OFFICE", seq="P", level="6", key="NO", ident="INDIRECT", suffix="工程师", occ="NO"),
        dict(cat="TECHNICAL", kind="OFFICE", seq="P", level="7", key="NO", ident="INDIRECT", suffix="高级工程师", occ="NO"),
        dict(cat="MANAGEMENT", kind="OFFICE", seq="M", level="8", key="NO", ident="MANAGEMENT", suffix="经理", occ="NO"),
        dict(cat="SUPPORT", kind="OFFICE", seq="P", level="4", key="NO", ident="INDIRECT", suffix="专员", occ="NO"),
    ]
    return profiles[idx % len(profiles)]


def build_slots(orgs: list[OrgNode]) -> list[OrgNode]:
    children: dict[str, list[str]] = {}
    for o in orgs:
        if o.parent:
            children.setdefault(o.parent, []).append(o.code)
    slots: list[OrgNode] = []
    for o in orgs:
        if o.headcount > 0:
            slots.extend([o] * o.headcount)
    # 管理部门负责人
    for o in orgs:
        if o.org_type in ("DIVISION", "DEPARTMENT"):
            slots.append(o)
        elif o.org_type == "TEAM" and o.headcount == 0 and o.code in children:
            slots.append(o)
    leaf_pool = [o for o in orgs if o.headcount > 0]
    while len(slots) < 520:
        slots.append(rng.choice(leaf_pool))
    return slots


def main() -> None:
    out_path = (
        Path(__file__).resolve().parents[1]
        / "src/main/resources/db/migration/V57__demo_full_company_seed.sql"
    )
    orgs = build_org_tree()
    by_code = {o.code: o for o in orgs}
    slots = build_slots(orgs)
    employee_count = len(slots)

    lines: list[str] = [
        "-- 完整公司样例：星河数字科技集团（研发/生产/销售/职能，员工 >= 520）",
        "-- 由 server/scripts/generate_demo_data.py 生成；对齐 V56 字段",
        "-- 策略：先清理组织/岗位/员工/汇报等业务数据，再灌入本批样例，避免与旧数据并存。",
        "-- 保留：数据字典、编码规则、父子值、员工组配置、权限/菜单/账号、流程定义等。",
        "",
        "SET NAMES utf8mb4;",
        "",
    ]

    # ── 0) 清理业务域（幂等重建的前提）──
    lines.append("-- ========== 0) 清理既有业务数据（避免旧/新并存） ==========")
    lines.append("""
SET FOREIGN_KEY_CHECKS = 0;

-- 员工档案子表
TRUNCATE TABLE employee_accommodation;
TRUNCATE TABLE employee_admin_info;
TRUNCATE TABLE employee_agent_assignment;
TRUNCATE TABLE employee_agreement;
TRUNCATE TABLE employee_attachment;
TRUNCATE TABLE employee_attendance_card;
TRUNCATE TABLE employee_bank_account;
TRUNCATE TABLE employee_contract;
TRUNCATE TABLE employee_cost_center_allocation;
TRUNCATE TABLE employee_education;
TRUNCATE TABLE employee_family_member;
TRUNCATE TABLE employee_id_document;
TRUNCATE TABLE employee_internal_relative;
TRUNCATE TABLE employee_penalty;
TRUNCATE TABLE employee_performance_record;
TRUNCATE TABLE employee_project;
TRUNCATE TABLE employee_qualification;
TRUNCATE TABLE employee_reward;
TRUNCATE TABLE employee_social_insurance;
TRUNCATE TABLE employee_special_benefit;
TRUNCATE TABLE employee_talent_review;
TRUNCATE TABLE employee_title_certificate;
TRUNCATE TABLE employee_training_record;
TRUNCATE TABLE employee_values_assessment;
TRUNCATE TABLE employee_work_experience;
TRUNCATE TABLE employee_work_injury;

-- 任职 / 主数据版本 / 异动 / 汇报
TRUNCATE TABLE employee_assignment;
TRUNCATE TABLE employee_master_version;
TRUNCATE TABLE employee_movement;
TRUNCATE TABLE reporting_line;

-- 员工主档
TRUNCATE TABLE employee;

-- 组织架构
TRUNCATE TABLE headcount_plan;
TRUNCATE TABLE role_org_scope;
TRUNCATE TABLE position;
TRUNCATE TABLE organization;
TRUNCATE TABLE legal_entity;

-- 解除登录账号与员工关联（不删账号）
UPDATE sys_user SET employee_id = NULL WHERE employee_id IS NOT NULL;

SET FOREIGN_KEY_CHECKS = 1;
""")

    lines.append("-- ========== 1) 法人实体 ==========")
    for code, name, credit, region in [
        ("LE-DEFAULT", "星河数字科技有限公司", "91310000MA1K8X7Y2Q", "上海市浦东新区"),
        ("LE-STAR-HOLDING", "星河控股集团有限公司", "91310000MA1HOLDING", "上海市黄浦区"),
        ("LE-STAR-SZ", "星河软件（深圳）有限公司", "91440300MA5SZTECH", "广东省深圳市南山区"),
        ("LE-STAR-CD", "星河科技（成都）有限公司", "91510100MA6CDTECH", "四川省成都市高新区"),
    ]:
        lines.append(
            f"INSERT INTO legal_entity (code, name, credit_code, region, status)\n"
            f"SELECT {esc(code)}, {esc(name)}, {esc(credit)}, {esc(region)}, 'ACTIVE'\n"
            f"WHERE NOT EXISTS (SELECT 1 FROM legal_entity WHERE code = {esc(code)});\n"
        )

    lines.append("-- ========== 2) 组织架构 ==========")
    for o in orgs:
        cc = f"CC-{o.code[-4:]}"
        if o.parent is None:
            lines.append(f"""
INSERT INTO organization (
  code, name, parent_code, parent_id, org_type, department_type, location, legal_company,
  department_level, cost_center, org_attribute, org_function, effective_start_date, effective_end_date, status
)
SELECT {esc(o.code)}, {esc(o.name)}, NULL, NULL, {esc(o.org_type)}, {esc(o.dept_type)},
  {esc(o.location)}, {esc(o.legal)}, {esc(o.level)}, {esc(cc)}, {esc(o.attr)}, {esc(o.func)},
  '2020-01-01', NULL, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM organization x WHERE x.code = {esc(o.code)} AND x.effective_end_date IS NULL);
""")
        else:
            lines.append(f"""
INSERT INTO organization (
  code, name, parent_code, parent_id, org_type, department_type, location, legal_company,
  department_level, cost_center, org_attribute, org_function, effective_start_date, effective_end_date, status
)
SELECT {esc(o.code)}, {esc(o.name)}, {esc(o.parent)}, p.id, {esc(o.org_type)}, {esc(o.dept_type)},
  {esc(o.location)}, {esc(o.legal)}, {esc(o.level)}, {esc(cc)}, {esc(o.attr)}, {esc(o.func)},
  '2020-01-01', NULL, 'ACTIVE'
FROM organization p
WHERE p.code = {esc(o.parent)} AND p.effective_end_date IS NULL
  AND NOT EXISTS (SELECT 1 FROM organization x WHERE x.code = {esc(o.code)} AND x.effective_end_date IS NULL);
""")

    lines.append("-- ========== 3) 岗位 ==========")
    pos_seq = 20010001
    org_pos: dict[str, list[tuple[str, str, dict]]] = {}
    for o in orgs:
        count = 1 if o.org_type == "COMPANY" else (4 if o.headcount >= 20 else 3 if o.org_type != "DIVISION" else 2)
        org_pos[o.code] = []
        for i in range(count):
            prof = position_profile(o, i)
            pname = f"{o.name}{prof['suffix']}" + ("" if i == 0 else str(i + 1))
            pcode = str(pos_seq)
            pos_seq += 1
            org_pos[o.code].append((pcode, pname, prof))
            lines.append(f"""
INSERT INTO position (
  code, name, organization_id, effective_start_date, effective_end_date, status,
  occupational_disease, position_category, position_kind, position_sequence,
  position_level, key_position, identity_category
)
SELECT {esc(pcode)}, {esc(pname)}, o.id, '2020-01-01', NULL, 'ACTIVE',
  {esc(prof['occ'])}, {esc(prof['cat'])}, {esc(prof['kind'])}, {esc(prof['seq'])},
  {esc(prof['level'])}, {esc(prof['key'])}, {esc(prof['ident'])}
FROM organization o
WHERE o.code = {esc(o.code)} AND o.effective_end_date IS NULL
  AND NOT EXISTS (SELECT 1 FROM position p WHERE p.code = {esc(pcode)} AND p.effective_start_date = '2020-01-01');
""")

    lines.append(f"-- ========== 4) 员工档案与花名册（{employee_count} 人） ==========")
    marital = ["SINGLE", "MARRIED", "MARRIED", "DIVORCED"]
    political = ["MASSES", "LEAGUE", "PARTY", "MASSES"]
    education = ["BACHELOR", "MASTER", "BACHELOR", "PHD", "COLLEGE"]
    fertility = ["NONE", "ONE_CHILD", "TWO_CHILDREN", "NONE"]
    ethnicity = ["HAN", "HAN", "HAN", "HUI", "ZHUANG", "MIAO"]
    household = ["URBAN", "RURAL", "URBAN"]
    relations = ["SPOUSE", "PARENT", "SIBLING", "CHILD"]
    channels = ["CAMPUS", "REFERRAL", "HEADHUNTER", "SOCIAL", "INTERNAL"]
    grades = ["P1", "P2", "P3", "M1", "M2"]
    attr_levels = ["FRONTLINE", "PROFESSIONAL", "MIDDLE_MGR", "BASE_MGR", "SENIOR_MGR"]

    # 预生成工号，供 HRBP/SSC/人资协调 引用真实花名册人员
    emp_nos: list[str] = []
    hire_dates: list[date] = []
    used_nos: set[str] = set()
    for i in range(employee_count):
        hire = date(2017, 1, 1) + timedelta(days=(i * 17) % 3200)
        emp_no = f"{hire.strftime('%y%m')}{(i + 1):04d}"
        while emp_no in used_nos:
            hire = hire + timedelta(days=1)
            emp_no = f"{hire.strftime('%y%m')}{(i + 1):04d}"
        used_nos.add(emp_no)
        emp_nos.append(emp_no)
        hire_dates.append(hire)

    emps_by_org: dict[str, list[str]] = {}
    for i, org in enumerate(slots):
        emps_by_org.setdefault(org.code, []).append(emp_nos[i])

    # HRBP 部 / 员工关系部(兼 SSC) / HR COE(人资协调)
    hrbp_pool = list(emps_by_org.get("20000271", []))
    ssc_pool = list(emps_by_org.get("20000272", []))
    hc_pool = list(emps_by_org.get("20000270", []))
    # 兜底：人力资源中心任意在岗者
    hr_fallback = (
        emps_by_org.get("20000271", [])
        + emps_by_org.get("20000272", [])
        + emps_by_org.get("20000270", [])
        + emps_by_org.get("20000105", [])
    )
    if not hrbp_pool:
        hrbp_pool = hr_fallback or emp_nos[:12]
    if not ssc_pool:
        ssc_pool = hr_fallback or emp_nos[12:20]
    if not hc_pool:
        hc_pool = hr_fallback or emp_nos[20:28]

    def pick_hr(pool: list[str], key: int) -> str:
        return pool[key % len(pool)]

    org_first_emp: dict[str, str] = {}
    for i, org in enumerate(slots):
        if org.code not in org_first_emp:
            org_first_emp[org.code] = emp_nos[i]

    for i, org in enumerate(slots):
        male = i % 3 != 1
        name = gen_name(male)
        gender = "MALE" if male else "FEMALE"
        birth = date(1984, 1, 1) + timedelta(days=rng.randint(0, 6000))
        hire = hire_dates[i]
        emp_no = emp_nos[i]
        hrbp_no = pick_hr(hrbp_pool, i)
        ssc_no = pick_hr(ssc_pool, i)
        hc_no = pick_hr(hc_pool, i)

        positions = org_pos[org.code]
        seen_in_org = sum(1 for j in range(i) if slots[j].code == org.code)
        if seen_in_org == 0:
            pos_code, pos_name, prof = positions[0]
        else:
            pos_code, pos_name, prof = positions[1 + (seen_in_org - 1) % max(1, len(positions) - 1)]

        mobile_enc = encrypt(gen_mobile(10000 + i))
        id_enc = encrypt(gen_id_card(birth, i))
        account_enc = encrypt(f"622202{rng.randint(100000000000, 999999999999)}")
        ss_enc = encrypt(f"SS{hire.year}{i:08d}")
        addr1, addr2 = LOC_ADDR[org.location]
        pinyin = ["zhang", "wang", "li", "liu", "chen", "yang", "zhao", "huang", "wu", "zhou"][i % 10]
        ad = f"{pinyin}{i + 1}"
        email = f"{ad}@starriver-tech.com"
        personal_email = f"{ad}{i}@163.com"
        school, major, edu_level, degree = rng.choice(SCHOOLS)
        work_start = birth + timedelta(days=rng.randint(7500, 9000))
        status = "PROBATION" if i % 25 == 0 else "ACTIVE"
        emp_type = "INTERN" if i % 40 == 0 else ("CONTRACT" if i % 33 == 0 else "FULL_TIME")
        is_prod = org.func == "MANUFACTURING" and prof["cat"] == "DIRECT_WORKER"
        eg, esg = group_codes(org.func, is_prod)
        wl = WORK_LOC[org.location]
        ins = INSURANCE[org.location]
        job_grade = "M2" if prof["key"] == "YES" else rng.choice(grades)
        bank_id, branch_id = rng.choice(BANK_PAIRS)
        high_edu = rng.choice(education)
        if edu_level in ("MASTER", "PHD"):
            high_edu = edu_level

        lines.append(f"""
-- 员工 {i + 1}: {name} ({emp_no}) @ {org.name}
INSERT INTO employee (
  employee_no, full_name, ad_account, gender, marital_status, political_affiliation,
  highest_education, highest_education_grad_date, fertility_status, ethnicity, hobbies,
  nationality, household_type, household_location, party_org_transferred, work_start_date,
  mobile, company_email, personal_email, wechat, office_phone, office_extension, home_phone,
  id_card_address, residence_address,
  emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
  recruitment_channel, recruitment_channel_detail, group_seniority_start_date,
  hire_date, status
)
SELECT {esc(emp_no)}, {esc(name)}, {esc(ad)}, {esc(gender)}, {esc(rng.choice(marital))}, {esc(rng.choice(political))},
  {esc(high_edu)}, {sql_date(hire - timedelta(days=rng.randint(30, 900)))}, {esc(rng.choice(fertility))},
  {esc(rng.choice(ethnicity))}, {esc(rng.choice(['跑步', '阅读', '摄影', '羽毛球', '烘焙', '徒步', '围棋', '吉他']))},
  'CHINA', {esc(rng.choice(household))}, {esc(addr1)}, {1 if rng.random() < 0.2 else 0},
  {sql_date(work_start)},
  {esc(mobile_enc)}, {esc(email)}, {esc(personal_email)}, {esc(f'wx_{ad}')},
  {esc(f'021-5888{1000 + (i % 9000):04d}')}, {esc(str(8000 + (i % 1000)))}, NULL,
  {esc(addr1)}, {esc(addr2)},
  {esc(gen_name(not male))}, {esc(gen_mobile(20000 + i))}, {esc(rng.choice(relations))},
  {esc(rng.choice(channels))}, {esc(rng.choice(['校招统一批次', '员工内推', '猎头推荐', '社招官网', '内部转岗']))},
  {sql_date(hire)}, {sql_date(hire)}, {esc(status)}
WHERE NOT EXISTS (SELECT 1 FROM employee e WHERE e.employee_no = {esc(emp_no)});
""")

        lines.append(f"""
INSERT INTO employee_master_version (
  employee_id, effective_start_date, effective_end_date, full_name, ad_account, gender,
  marital_status, political_affiliation, highest_education, highest_education_grad_date,
  fertility_status, ethnicity, hobbies, nationality, household_type, household_location,
  party_org_transferred, work_start_date, mobile, company_email, personal_email, wechat,
  office_phone, office_extension, home_phone, id_card_address, residence_address,
  emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
  recruitment_channel, recruitment_channel_detail, group_seniority_start_date, hire_date, status
)
SELECT e.id, e.hire_date, NULL, e.full_name, e.ad_account, e.gender,
  e.marital_status, e.political_affiliation, e.highest_education, e.highest_education_grad_date,
  e.fertility_status, e.ethnicity, e.hobbies, e.nationality, e.household_type, e.household_location,
  e.party_org_transferred, e.work_start_date, e.mobile, e.company_email, e.personal_email, e.wechat,
  e.office_phone, e.office_extension, e.home_phone, e.id_card_address, e.residence_address,
  e.emergency_contact_name, e.emergency_contact_phone, e.emergency_contact_relation,
  e.recruitment_channel, e.recruitment_channel_detail, e.group_seniority_start_date, e.hire_date, e.status
FROM employee e
WHERE e.employee_no = {esc(emp_no)}
  AND NOT EXISTS (SELECT 1 FROM employee_master_version v WHERE v.employee_id = e.id);
""")

        lines.append(f"""
INSERT INTO employee_id_document (employee_id, country_region, id_type, id_number, valid_from, valid_to, is_primary)
SELECT e.id, 'CHINA', 'ID_CARD', {esc(id_enc)}, {sql_date(birth + timedelta(days=6570))}, {sql_date(date(2045, 12, 31))}, 1
FROM employee e WHERE e.employee_no = {esc(emp_no)}
  AND NOT EXISTS (SELECT 1 FROM employee_id_document d WHERE d.employee_id = e.id AND d.is_primary = 1);
""")

        lines.append(f"""
INSERT INTO employee_assignment (
  employee_id, organization_id, position_id, employment_type, employment_sub_type, employee_nature,
  contract_location, work_location, is_primary, assignment_indicator,
  is_responsibility_system, is_management_cadre, is_core_talent,
  group_attr_level, salary_group, supplier, probation_period,
  job_grade_code, job_sequence,
  hire_date, is_rehire, movement_type, reason_code, reason_sub_code,
  employee_group_code, employee_subgroup_code,
  legal_entity_code, payroll_company_code, cost_legal_entity_code,
  position_start_date, expected_regularization_date, actual_regularization_date,
  group_seniority_start_date, department_name, team_name,
  center_name, hr_coordinator_no, hrbp_no, ssc_no,
  legal_entity_id, payroll_company_id, cost_legal_entity_id,
  effective_start_date, effective_end_date
)
SELECT e.id, o.id, p.id, {esc(emp_type)}, 'REGULAR', {esc(nature_of(org.func))},
  {esc('HQ' if org.location == 'SHANGHAI' else 'BRANCH')}, {esc(wl)}, 1, 'PRIMARY',
  {1 if prof['key'] == 'YES' else 0}, {1 if prof['cat'] == 'MANAGEMENT' else 0}, {1 if i % 17 == 0 else 0},
  {esc(rng.choice(attr_levels))}, {esc(rng.choice(['SG_MONTHLY', 'SG_HOURLY'] if is_prod else ['SG_MONTHLY']))},
  'SELF', {esc(rng.choice(['3M', '6M']))},
  {esc(job_grade)}, {esc(prof['seq'])},
  {sql_date(hire)}, 0, 'HIR', 'H01', NULL,
  {esc(eg)}, {esc(esg)},
  {esc(org.legal)}, {esc(org.legal)}, {esc(org.legal)},
  {sql_date(hire)}, {sql_date(hire + timedelta(days=90))},
  {sql_date(hire + timedelta(days=180)) if status == 'ACTIVE' else 'NULL'},
  {sql_date(hire)}, {esc(org.name if org.org_type != 'TEAM' else by_code.get(org.parent, org).name if org.parent else org.name)},
  {esc(org.name if org.org_type == 'TEAM' else '')},
  {esc(by_code.get(org.parent, org).name if org.parent and by_code.get(org.parent) and by_code[org.parent].org_type == 'DIVISION' else org.name)},
  {esc(hc_no)}, {esc(hrbp_no)}, {esc(ssc_no)},
  le.id, le.id, le.id,
  {sql_date(hire)}, NULL
FROM employee e
JOIN organization o ON o.code = {esc(org.code)} AND o.effective_end_date IS NULL
JOIN position p ON p.code = {esc(pos_code)} AND p.effective_end_date IS NULL
JOIN legal_entity le ON le.code = {esc(org.legal)}
WHERE e.employee_no = {esc(emp_no)}
  AND NOT EXISTS (SELECT 1 FROM employee_assignment a WHERE a.employee_id = e.id AND a.is_primary = 1 AND a.effective_end_date IS NULL);
""")

        # 汇报线：优先上级组织负责人，否则序号靠前的同事
        mgr_no = None
        if org.parent and org.parent in org_first_emp and org_first_emp[org.parent] != emp_no:
            mgr_no = org_first_emp[org.parent]
        elif org.code in org_first_emp and org_first_emp[org.code] != emp_no:
            mgr_no = org_first_emp[org.code]
        elif i > 0:
            mgr_no = emp_nos[max(0, i - 1 - (i % 9))]
        if mgr_no and mgr_no != emp_no:
            lines.append(f"""
INSERT INTO reporting_line (employee_id, manager_employee_id, line_type, effective_start_date, effective_end_date)
SELECT e.id, m.id, 'DIRECT', {sql_date(hire)}, NULL
FROM employee e
JOIN employee m ON m.employee_no = {esc(mgr_no)}
WHERE e.employee_no = {esc(emp_no)} AND e.id <> m.id
  AND NOT EXISTS (SELECT 1 FROM reporting_line r WHERE r.employee_id = e.id AND r.line_type = 'DIRECT' AND r.effective_end_date IS NULL);
""")

        lines.append(f"""
INSERT INTO employee_movement (
  employee_id, movement_type, movement_type_name, reason_code, reason_description, effective_date, remark
)
SELECT e.id, 'HIR', '雇佣', 'H01', '社会招聘入职', {sql_date(hire)}, {esc(f'{name} 加入星河数字科技')}
FROM employee e WHERE e.employee_no = {esc(emp_no)}
  AND NOT EXISTS (SELECT 1 FROM employee_movement m WHERE m.employee_id = e.id AND m.movement_type = 'HIR');
""")

        lines.append(f"""
INSERT INTO employee_cost_center_allocation (employee_id, legal_entity_id, cost_center, percentage, effective_start_date)
SELECT e.id, le.id, {esc(f'CC-{org.code[-4:]}')}, 100.00, {sql_date(hire)}
FROM employee e JOIN legal_entity le ON le.code = {esc(org.legal)}
WHERE e.employee_no = {esc(emp_no)}
  AND NOT EXISTS (SELECT 1 FROM employee_cost_center_allocation c WHERE c.employee_id = e.id);
""")

        lines.append(f"""
INSERT INTO employee_contract (
  employee_id, contract_code, contract_type, contract_category, contract_category_desc,
  legal_entity_id, operation_type, start_date, end_date, effective_date, effective_start_date, status, remark
)
SELECT e.id, {esc(f'CT-{emp_no}')}, 'LABOR', '60', '110', le.id, 'NEW',
  {sql_date(hire)}, {sql_date(hire + timedelta(days=365 * 3))}, {sql_date(hire)}, {sql_date(hire)}, 'ACTIVE', '劳动合同'
FROM employee e JOIN legal_entity le ON le.code = {esc(org.legal)}
WHERE e.employee_no = {esc(emp_no)}
  AND NOT EXISTS (SELECT 1 FROM employee_contract c WHERE c.employee_id = e.id);
""")

        if i % 4 == 0:
            lines.append(f"""
INSERT INTO employee_agreement (
  employee_id, agreement_code, agreement_type, agreement_category, operation_type,
  legal_entity_id, start_date, end_date, effective_start_date, status, remark
)
SELECT e.id, {esc(f'AG-{emp_no}')}, 'CONFIDENTIALITY', '10', '10', le.id,
  {sql_date(hire)}, {sql_date(hire + timedelta(days=365 * 5))}, {sql_date(hire)}, 'ACTIVE', '保密协议'
FROM employee e JOIN legal_entity le ON le.code = {esc(org.legal)}
WHERE e.employee_no = {esc(emp_no)}
  AND NOT EXISTS (SELECT 1 FROM employee_agreement a WHERE a.employee_id = e.id);
""")

        lines.append(f"""
INSERT INTO employee_attendance_card (
  employee_id, card_no, participate_in_attendance, effective_start_date, effective_end_date, status, remark
)
SELECT e.id, {esc(f'AC{emp_no}')}, 'YES', {sql_date(hire)}, NULL, 'ACTIVE', '考勤卡'
FROM employee e WHERE e.employee_no = {esc(emp_no)}
  AND NOT EXISTS (SELECT 1 FROM employee_attendance_card a WHERE a.employee_id = e.id);
""")

        lines.append(f"""
INSERT INTO employee_bank_account (
  employee_id, account_type, country_code, bank_id, branch_id, account_no, account_name, currency_code, is_primary
)
SELECT e.id, 'SALARY', 'CN', {esc(bank_id)}, {esc(branch_id)}, {esc(account_enc)}, {esc(name)}, 'CNY', 1
FROM employee e WHERE e.employee_no = {esc(emp_no)}
  AND NOT EXISTS (SELECT 1 FROM employee_bank_account b WHERE b.employee_id = e.id AND b.is_primary = 1);
""")

        lines.append(f"""
INSERT INTO employee_social_insurance (
  employee_id, social_security_no, social_base, housing_fund_no, housing_base, company, insurance_region, is_company_payroll
)
SELECT e.id, {esc(ss_enc)}, {rng.randint(8000, 35000)}.00, {esc(f'HF{emp_no}')}, {rng.randint(8000, 35000)}.00,
  '星河数字科技有限公司', {esc(ins)}, 1
FROM employee e WHERE e.employee_no = {esc(emp_no)}
  AND NOT EXISTS (SELECT 1 FROM employee_social_insurance s WHERE s.employee_id = e.id);
""")

        if i % 8 == 0:
            lines.append(f"""
INSERT INTO employee_special_benefit (employee_id, has_special_benefit, end_date)
SELECT e.id, 'YES', {sql_date(hire + timedelta(days=365))}
FROM employee e WHERE e.employee_no = {esc(emp_no)}
  AND NOT EXISTS (SELECT 1 FROM employee_special_benefit b WHERE b.employee_id = e.id);
""")

        if i % 7 == 0:
            lines.append(f"""
INSERT INTO employee_admin_info (
  employee_id, effective_start_date, status, work_environment, take_shuttle, parking_permit
)
SELECT e.id, {sql_date(hire)}, 'ACTIVE', {esc(rng.choice(['10', '20', '30']))},
  {esc(rng.choice(['YES', 'NO']))}, {esc(rng.choice(['YES', 'NO']))}
FROM employee e WHERE e.employee_no = {esc(emp_no)}
  AND NOT EXISTS (SELECT 1 FROM employee_admin_info a WHERE a.employee_id = e.id);
""")

        if i % 20 == 0:
            lines.append(f"""
INSERT INTO employee_accommodation (
  employee_id, effective_start_date, status, has_accommodation, accommodation_fee_total
)
SELECT e.id, {sql_date(hire)}, 'ACTIVE', 'YES', {rng.randint(200, 1500)}.00
FROM employee e WHERE e.employee_no = {esc(emp_no)}
  AND NOT EXISTS (SELECT 1 FROM employee_accommodation a WHERE a.employee_id = e.id);
""")

        lines.append(f"""
INSERT INTO employee_education (
  employee_id, degree, education_level, is_highest, country_region, school_name, major, start_date, end_date, diploma_no
)
SELECT e.id, {esc(degree)}, {esc(edu_level)}, 1, 'CHINA', {esc(school)}, {esc(major)},
  {sql_date(hire - timedelta(days=rng.randint(1500, 2500)))}, {sql_date(hire - timedelta(days=rng.randint(30, 400)))},
  {esc(f'DIP-{emp_no}')}
FROM employee e WHERE e.employee_no = {esc(emp_no)}
  AND NOT EXISTS (SELECT 1 FROM employee_education ed WHERE ed.employee_id = e.id AND ed.is_highest = 1);
""")

        lines.append(f"""
INSERT INTO employee_work_experience (
  employee_id, employer_name, department, position, start_date, end_date, leave_reason, last_salary, referee, referee_phone, currency_code
)
SELECT e.id, {esc(rng.choice(COMPANIES_PREV))}, {esc('研发中心')}, {esc('高级工程师')},
  {sql_date(hire - timedelta(days=rng.randint(900, 2000)))}, {sql_date(hire - timedelta(days=30))},
  {esc('职业发展')}, {rng.randint(12000, 45000)}.00, {esc(gen_name(True))}, {esc(gen_mobile(40000 + i))}, 'CNY'
FROM employee e WHERE e.employee_no = {esc(emp_no)}
  AND NOT EXISTS (SELECT 1 FROM employee_work_experience w WHERE w.employee_id = e.id);
""")

        if i % 5 == 0:
            lines.append(f"""
INSERT INTO employee_family_member (employee_id, name, relation, is_internal_employee, phone, employer, position, birth_date)
SELECT e.id, {esc(gen_name(not male))}, 'SPOUSE', 0, {esc(gen_mobile(30000 + i))},
  {esc(rng.choice(COMPANIES_PREV))}, {esc('职员')}, {sql_date(birth + timedelta(days=rng.randint(0, 800)))}
FROM employee e WHERE e.employee_no = {esc(emp_no)}
  AND NOT EXISTS (SELECT 1 FROM employee_family_member f WHERE f.employee_id = e.id);
""")

        if i % 6 == 0:
            lines.append(f"""
INSERT INTO employee_qualification (
  employee_id, skill_type, first_issue_date, expiry_date, certificate_name, certificate_no, issuing_org
)
SELECT e.id, {esc(rng.choice(['SOFT', 'HARD', 'LANGUAGE']))}, {sql_date(hire - timedelta(days=400))},
  {sql_date(hire + timedelta(days=2000))}, {esc(rng.choice(['PMP', '软考中级', '六级证书', '电工证']))},
  {esc(f'CERT-{emp_no}')}, {esc('工业和信息化部')}
FROM employee e WHERE e.employee_no = {esc(emp_no)}
  AND NOT EXISTS (SELECT 1 FROM employee_qualification q WHERE q.employee_id = e.id);
""")

        if i % 12 == 0:
            lines.append(f"""
INSERT INTO employee_reward (
  employee_id, effective_date, type, level, amount, payment_method, issuing_org, description
)
SELECT e.id, {sql_date(hire + timedelta(days=365))}, '10', '10', 5000.00, '10', '星河数字科技集团', '年度优秀员工'
FROM employee e WHERE e.employee_no = {esc(emp_no)}
  AND NOT EXISTS (SELECT 1 FROM employee_reward r WHERE r.employee_id = e.id);
""")

        lines.append(f"""
INSERT INTO employee_training_record (
  employee_id, course_name, training_type, training_form, start_date, end_date, hours,
  assessment_method, assessment_result, training_location, trainer, training_cost
)
SELECT e.id, {esc(rng.choice(['新员工入职培训', '信息安全意识培训', '精益生产导入', '销售赋能工作坊']))},
  {esc(rng.choice(['10', '20', '30', '50']))}, {esc(rng.choice(['10', '20']))},
  {sql_date(hire + timedelta(days=7))}, {sql_date(hire + timedelta(days=14))}, 16.00,
  {esc(rng.choice(['10', '20', '50']))}, {esc(rng.choice(['10', '10', '30']))},
  {esc(org.location)}, '星河学院', {rng.randint(0, 3000)}.00
FROM employee e WHERE e.employee_no = {esc(emp_no)}
  AND NOT EXISTS (SELECT 1 FROM employee_training_record t WHERE t.employee_id = e.id);
""")

        lines.append(f"""
INSERT INTO employee_performance_record (
  employee_id, year, assessment_type, performance_start_date, performance_end_date,
  values_level, performance_level, performance_score, values_score
)
SELECT e.id, '2025', {esc(rng.choice(['ANNUAL', 'SEMI_ANNUAL']))}, '2025-01-01', '2025-12-31',
  {esc(rng.choice(['A', 'B', 'C']))}, {esc(rng.choice(['A', 'B+', 'B', 'A-']))},
  {esc(str(rng.randint(80, 98)))}, {esc(str(rng.randint(80, 95)))}
FROM employee e WHERE e.employee_no = {esc(emp_no)}
  AND NOT EXISTS (SELECT 1 FROM employee_performance_record p WHERE p.employee_id = e.id AND p.year = '2025');
""")

        if i % 5 == 0:
            lines.append(f"""
INSERT INTO employee_values_assessment (
  employee_id, assessment_time, final_level, superior_evaluation, peer_evaluation,
  user_first, goal_first, pragmatic_responsibility, organization_first, integrity_honesty
)
SELECT e.id, '2025-H2', {esc(rng.choice(['HIGH', 'MEDIUM', 'LOW']))},
  {esc('表现稳定，协作良好')}, {esc('跨团队支持积极')},
  {esc(str(rng.randint(3, 5)))}, {esc(str(rng.randint(3, 5)))}, {esc(str(rng.randint(3, 5)))},
  {esc(str(rng.randint(3, 5)))}, {esc(str(rng.randint(3, 5)))}
FROM employee e WHERE e.employee_no = {esc(emp_no)}
  AND NOT EXISTS (SELECT 1 FROM employee_values_assessment v WHERE v.employee_id = e.id);
""")

        if i % 8 == 0:
            lines.append(f"""
INSERT INTO employee_talent_review (
  employee_id, year, performance_score, performance_placement, potential_score, potential_placement,
  values_score, nine_box_placement, subjective_evaluation
)
SELECT e.id, '2025',
  {esc(str(round(rng.uniform(3.5, 4.8), 1)))}, {esc(rng.choice(['高', '中高', '中']))},
  {esc(str(round(rng.uniform(3.2, 4.6), 1)))}, {esc(rng.choice(['高潜', '中潜', '稳']))},
  {esc(str(round(rng.uniform(3.4, 4.5), 1)))}, {esc(rng.choice(['明星', '核心', '稳定骨']))},
  {esc('综合表现良好，建议持续关注发展路径。')}
FROM employee e WHERE e.employee_no = {esc(emp_no)}
  AND NOT EXISTS (SELECT 1 FROM employee_talent_review t WHERE t.employee_id = e.id AND t.year = '2025');
""")

        if i % 3 == 0:
            lines.append(f"""
INSERT INTO employee_project (
  employee_id, project_name, project_description, role, start_date, end_date, personal_contribution, final_outcome
)
SELECT e.id, {esc(rng.choice(['星河HR中台', '智能制造MES', '海外CRM升级', '数据治理平台']))},
  {esc('支撑核心业务数字化转型的重点项目')}, {esc(rng.choice(['开发', '产品', '测试', '项目经理', '工艺']))},
  {sql_date(hire + timedelta(days=60))}, NULL, {esc('核心模块交付')}, {esc(rng.choice(['1', '2', '3']))}
FROM employee e WHERE e.employee_no = {esc(emp_no)}
  AND NOT EXISTS (SELECT 1 FROM employee_project p WHERE p.employee_id = e.id);
""")

        if i % 15 == 0:
            lines.append(f"""
INSERT INTO employee_agent_assignment (
  employee_id, primary_agent_tag, start_date, end_date, agent_name, agent_identity, agent_role,
  is_architect, is_militia, is_data_steward, percentage
)
SELECT e.id, {esc(rng.choice(['YES', 'NO']))}, {sql_date(hire)}, NULL,
  {esc(rng.choice(['招聘助手', '考勤机器人', '知识库助手']))}, {esc(f'AGT-{i:04d}')},
  {esc(rng.choice(['负责人', '协作者', '顾问']))},
  {esc(rng.choice(['YES', 'NO']))}, {esc(rng.choice(['YES', 'NO']))}, {esc(rng.choice(['YES', 'NO']))},
  {rng.choice([20, 30, 50, 80, 100])}
FROM employee e WHERE e.employee_no = {esc(emp_no)}
  AND NOT EXISTS (SELECT 1 FROM employee_agent_assignment a WHERE a.employee_id = e.id);
""")

    # 回填组织负责人 / HRBP / SSC / 人资协调（全部使用真实工号）
    lines.append("-- ========== 5) 回填组织负责人工号与 HRBP/SSC ==========")
    org_codes_ordered = [o.code for o in orgs]
    for idx, code in enumerate(org_codes_ordered):
        leader = org_first_emp.get(code)
        if not leader:
            continue
        hrbp_no = pick_hr(hrbp_pool, idx)
        ssc_no = pick_hr(ssc_pool, idx)
        hc_no = pick_hr(hc_pool, idx)
        lines.append(f"""
UPDATE organization o
JOIN employee e ON e.employee_no = {esc(leader)}
SET o.org_leader_no = e.employee_no,
    o.hrbp_no = {esc(hrbp_no)},
    o.ssc_no = {esc(ssc_no)},
    o.hr_coordinator_no = {esc(hc_no)}
WHERE o.code = {esc(code)} AND o.effective_end_date IS NULL;
""")

    # 编制计划
    lines.append("-- ========== 6) 编制计划 ==========")
    for o in orgs:
        if o.org_type in ("DIVISION", "DEPARTMENT") or o.headcount > 0:
            planned = max(o.headcount, 5) + (8 if o.org_type == "DIVISION" else 2)
            lines.append(f"""
INSERT INTO headcount_plan (organization_id, fiscal_year, planned_count, occupied_count, reserved_count)
SELECT o.id, 2026, {planned}, 0, 0
FROM organization o
WHERE o.code = {esc(o.code)} AND o.effective_end_date IS NULL
  AND NOT EXISTS (SELECT 1 FROM headcount_plan h WHERE h.organization_id = o.id AND h.fiscal_year = 2026);
""")

    max_dept = max(int(o.code) for o in orgs if o.code.isdigit())
    lines.append(f"""
-- ========== 7) 更新编码规则游标 ==========
UPDATE code_rule SET last_seq = GREATEST(COALESCE(last_seq, 0), {max_dept}) WHERE code = 'DEPT_CODE';
UPDATE code_rule SET last_seq = GREATEST(COALESCE(last_seq, 0), {pos_seq - 1}) WHERE code = 'POSITION_CODE';
""")

    # occupied_count 回填
    lines.append("""
UPDATE headcount_plan h
JOIN (
  SELECT a.organization_id, COUNT(*) AS cnt
  FROM employee_assignment a
  WHERE a.effective_end_date IS NULL AND a.is_primary = 1
  GROUP BY a.organization_id
) t ON t.organization_id = h.organization_id
SET h.occupied_count = t.cnt
WHERE h.fiscal_year = 2026;
""")

    out_path.write_text("\n".join(lines), encoding="utf-8")
    print(f"Generated: {out_path}")
    print(f"Organizations: {len(orgs)}")
    print(f"Positions: {sum(len(v) for v in org_pos.values())}")
    print(f"Employees: {employee_count}")
    func_counts: dict[str, int] = {}
    for o in slots:
        func_counts[o.func] = func_counts.get(o.func, 0) + 1
    print("By function:", func_counts)


if __name__ == "__main__":
    main()
