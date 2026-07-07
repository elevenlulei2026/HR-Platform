#!/usr/bin/env python3
"""生成 V21 大规模演示样例数据 SQL（组织 / 岗位 / 员工档案）。"""

from __future__ import annotations

import base64
import os
import random
import struct
from datetime import date, timedelta
from pathlib import Path

try:
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
except ImportError:
    raise SystemExit("请先安装 cryptography: pip install cryptography")

# 与 application.yml 默认 HR_CRYPTO_KEY 一致
CRYPTO_KEY_B64 = os.environ.get(
    "HR_CRYPTO_KEY", "MDEyMzQ1Njc4OUFCQ0RFRjAxMjM0NTY3ODlBQkNERUY="
)
PREFIX = "ENC:"

SURNAMES = list(
    "赵钱孙李周吴郑王冯陈褚卫蒋沈韩杨朱秦尤许何吕施张孔曹严华金魏陶姜戚谢邹喻柏水窦章云苏潘葛奚范彭郎鲁韦昌马苗凤花方俞任袁柳酆鲍史唐费廉岑薛雷贺倪汤滕殷罗毕郝邬安常乐于时傅皮卞齐康伍余元卜顾孟平黄和穆萧尹姚邵湛汪祁毛禹狄米贝明臧计伏成戴谈宋茅庞熊纪舒屈项祝董梁杜阮蓝闵席季麻强贾路娄危江童颜郭梅盛林刁钟徐邱骆高夏蔡田樊胡凌霍虞万支柯昝管卢莫经房裘缪干解应宗丁宣贲邓郁单杭洪包诸左石崔吉钮龚程嵇邢滑裴陆荣翁荀羊於惠甄曲家封芮羿储靳汲邴糜松井段富巫乌焦巴弓牧隗山谷车侯宓蓬全郗班仰秋仲伊宫宁仇栾暴甘钭厉戎祖武符刘景詹束龙叶幸司韶郜黎蓟薄印宿白怀蒲邰从鄂索咸籍赖卓蔺屠蒙池乔阴鬱胥能苍双闻莘党翟谭贡劳逄姬申扶堵冉宰郦雍卻璩桑桂濮牛寿通边扈燕冀郏浦尚农温别庄晏柴瞿阎充慕连茹习宦艾鱼容向古易慎戈廖庾终暨居衡步都耿满弘匡国文寇广禄阙东欧殳沃利蔚越夔隆师巩厍聂晁勾敖融冷訾辛阚那简饶空曾毋沙乜养鞠须丰巢关蒯相查后荆红游竺权逯盖益桓公"
)
GIVEN_MALE = "伟强磊洋勇军杰涛明超秀英华建国建华志强志明浩然子轩梓豪宇轩俊杰文博天佑嘉懿睿哲皓轩"
GIVEN_FEMALE = "芳娜敏静丽艳娟霞秀兰梅琳雪慧颖婷怡欣雨萱梓涵诗涵思涵梦琪佳怡欣怡语嫣若曦晓彤雅琪静雯"
CITIES = {
    "SHANGHAI": ("上海市浦东新区张江高科技园区", "上海市徐汇区漕河泾开发区"),
    "BEIJING": ("北京市海淀区中关村软件园", "北京市朝阳区望京科技园"),
    "SHENZHEN": ("深圳市南山区科技园", "深圳市福田区CBD"),
    "CHENGDU": ("成都市高新区天府软件园", "成都市武侯区科华路"),
    "HANGZHOU": ("杭州市余杭区未来科技城", "杭州市滨江区网商路"),
    "GUANGZHOU": ("广州市天河区珠江新城", "广州市黄埔区科学城"),
    "NANJING": ("南京市江宁区秣周东路", "南京市建邺区奥体大街"),
    "SUZHOU": ("苏州市工业园区星湖街", "苏州市高新区科技城"),
}
SCHOOLS = [
    ("清华大学", "计算机科学与技术", "MASTER", "硕士"),
    ("北京大学", "软件工程", "BACHELOR", "本科"),
    ("复旦大学", "信息管理", "BACHELOR", "本科"),
    ("上海交通大学", "电子信息", "MASTER", "硕士"),
    ("浙江大学", "人工智能", "MASTER", "硕士"),
    ("南京大学", "数学", "BACHELOR", "本科"),
    ("华中科技大学", "通信工程", "BACHELOR", "本科"),
    ("中山大学", "工商管理", "BACHELOR", "本科"),
    ("同济大学", "土木工程", "BACHELOR", "本科"),
    ("西安交通大学", "自动化", "BACHELOR", "本科"),
]
COMPANIES_PREV = [
    "腾讯科技", "阿里巴巴", "字节跳动", "华为技术", "美团", "京东集团",
    "百度在线", "小米科技", "网易杭州", "携程旅行", "拼多多", "蚂蚁集团",
]
BANKS = [
    ("中国工商银行", "102100099996"),
    ("中国建设银行", "105584000013"),
    ("招商银行", "308584000013"),
    ("中国银行", "104100000004"),
]

rng = random.Random(20260707)


def encrypt(plain: str) -> str:
    key = base64.b64decode(CRYPTO_KEY_B64)
    aesgcm = AESGCM(key)
    iv = os.urandom(12)
    ct = aesgcm.encrypt(iv, plain.encode("utf-8"), None)
    payload = iv + ct
    return PREFIX + base64.b64encode(payload).decode("ascii")


def esc(s: str | None) -> str:
    if s is None:
        return "NULL"
    return "'" + str(s).replace("\\", "\\\\").replace("'", "''") + "'"


def sql_date(d: date | None) -> str:
    if d is None:
        return "NULL"
    return f"'{d.isoformat()}'"


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
    return prefixes[seq % len(prefixes)] + f"{seq % 100000000:08d}"[:8]


def gen_name(male: bool) -> str:
    surname = rng.choice(SURNAMES)
    pool = GIVEN_MALE if male else GIVEN_FEMALE
    given_len = 1 if rng.random() < 0.35 else 2
    given = "".join(rng.choice(pool) for _ in range(given_len))
    return surname + given


# ── 组织树定义 ──────────────────────────────────────────────
# (code, name, parent_code, org_type, location, legal_company, dept_level, dept_type, org_function, org_attribute)
ORG_TREE: list[tuple] = []

def add_org(code, name, parent, org_type, location="SHANGHAI", legal="LE-DEFAULT",
            level=None, dept_type=None, func="FUNCTION", attr="PHYSICAL"):
    if level is None:
        level = {"COMPANY": "L1", "DIVISION": "L1", "DEPARTMENT": "L2", "TEAM": "L3"}.get(org_type, "L3")
    ORG_TREE.append((code, name, parent, org_type, location, legal, level, dept_type, func, attr))


# 新增一级中心（在 V9 既有中心之外扩展）
NEW_DIVISIONS = [
    ("20000101", "智能制造中心", "ORG-ROOT", "RND", "SUZHOU"),
    ("20000102", "供应链中心", "ORG-ROOT", "MANUFACTURING", "SUZHOU"),
    ("20000103", "质量管理中心", "ORG-ROOT", "FUNCTION", "SHANGHAI"),
    ("20000104", "国际业务中心", "ORG-ROOT", "MARKET", "SHANGHAI"),
    ("20000105", "法务合规中心", "ORG-ROOT", "FUNCTION", "BEIJING"),
    ("20000106", "战略与投资中心", "ORG-ROOT", "FUNCTION", "SHANGHAI"),
    ("20000107", "信息技术中心", "ORG-ROOT", "RND", "SHANGHAI"),
    ("20000108", "运营中心", "ORG-ROOT", "FUNCTION", "SHANGHAI"),
    ("20000109", "品牌与公关中心", "ORG-ROOT", "MARKET", "SHANGHAI"),
    ("20000110", "数据治理中心", "ORG-ROOT", "RND", "HANGZHOU"),
    ("20000111", "杭州研发中心", "ORG-ROOT", "RND", "HANGZHOU", "LE-STAR-SZ"),
    ("20000112", "北京研发中心", "ORG-ROOT", "RND", "BEIJING"),
    ("20000113", "南京研发中心", "ORG-ROOT", "RND", "NANJING"),
    ("20000114", "广州销售大区", "ORG-ROOT", "MARKET", "GUANGZHOU"),
    ("20000115", "企业安全中心", "ORG-ROOT", "FUNCTION", "BEIJING"),
]
for d in NEW_DIVISIONS:
    code, name, parent, func, loc = d[:5]
    legal = d[5] if len(d) > 5 else "LE-DEFAULT"
    add_org(code, name, parent, "DIVISION", loc, legal, "L1", "BUSINESS_UNIT", func)

# 二级部门模板
DEPT_TEMPLATES = {
    "ORG-RD": [
        ("20000201", "基础架构部", "RND"), ("20000202", "中间件研发部", "RND"),
        ("20000203", "移动研发部", "RND"), ("20000204", "安全研发部", "RND"),
        ("20000205", "DevOps 工程部", "RND"),
    ],
    "ORG-PD": [
        ("20000206", "B端产品部", "MARKET"), ("20000207", "C端产品部", "MARKET"),
        ("20000208", "数据产品部", "RND"), ("20000209", "产品运营部", "MARKET"),
    ],
    "ORG-HR": [
        ("20000210", "薪酬福利部", "FUNCTION"), ("20000211", "组织发展部", "FUNCTION"),
        ("20000212", "学习发展部", "FUNCTION"), ("20000213", "员工关系部", "FUNCTION"),
    ],
    "ORG-FIN": [
        ("20000214", "资金管理部", "FUNCTION"), ("20000215", "税务管理部", "FUNCTION"),
        ("20000216", "内控审计部", "FUNCTION"), ("20000217", "采购管理部", "FUNCTION"),
    ],
    "ORG-SM": [
        ("20000218", "西南销售部", "MARKET"), ("20000219", "华中销售部", "MARKET"),
        ("20000220", "大客户销售部", "MARKET"), ("20000221", "渠道销售部", "MARKET"),
        ("20000222", "售前解决方案部", "MARKET"),
    ],
    "ORG-CS": [
        ("20000223", "续约管理部", "MARKET"), ("20000224", "培训赋能部", "FUNCTION"),
        ("20000225", "服务运营部", "FUNCTION"),
    ],
    "ORG-RD-SZ": [
        ("20000226", "嵌入式研发部", "RND"), ("20000227", "硬件研发部", "RND"),
        ("20000228", "IoT 平台部", "RND"),
    ],
    "ORG-RD-CD": [
        ("20000229", "算法工程部", "RND"), ("20000230", "大数据平台部", "RND"),
        ("20000231", "AI 应用部", "RND"),
    ],
    "20000101": [  # 智能制造
        ("20000232", "生产一部", "MANUFACTURING"), ("20000233", "生产二部", "MANUFACTURING"),
        ("20000234", "设备工程部", "MANUFACTURING"), ("20000235", "工艺工程部", "MANUFACTURING"),
        ("20000236", "精益改善部", "MANUFACTURING"),
    ],
    "20000102": [  # 供应链
        ("20000237", "采购部", "MANUFACTURING"), ("20000238", "仓储物流部", "MANUFACTURING"),
        ("20000239", "计划物控部", "MANUFACTURING"), ("20000240", "进出口贸易部", "MANUFACTURING"),
    ],
    "20000103": [
        ("20000241", "来料检验部", "FUNCTION"), ("20000242", "过程质量部", "FUNCTION"),
        ("20000243", "质量体系部", "FUNCTION"), ("20000244", "客户质量部", "FUNCTION"),
    ],
    "20000104": [
        ("20000245", "亚太事业部", "MARKET"), ("20000246", "欧洲事业部", "MARKET"),
        ("20000247", "北美事业部", "MARKET"), ("20000248", "海外交付部", "MARKET"),
    ],
    "20000105": [
        ("20000249", "法务部", "FUNCTION"), ("20000250", "合规监察部", "FUNCTION"),
        ("20000251", "知识产权部", "FUNCTION"),
    ],
    "20000106": [
        ("20000252", "战略规划部", "FUNCTION"), ("20000253", "投资并购部", "FUNCTION"),
        ("20000254", "董事会办公室", "FUNCTION"),
    ],
    "20000107": [
        ("20000255", "基础设施部", "RND"), ("20000256", "企业应用部", "RND"),
        ("20000257", "信息安全部", "RND"), ("20000258", "IT 服务台", "FUNCTION"),
    ],
    "20000108": [
        ("20000259", "流程管理部", "FUNCTION"), ("20000260", "商业分析部", "FUNCTION"),
        ("20000261", "项目管理办公室", "FUNCTION"),
    ],
    "20000109": [
        ("20000262", "品牌传播部", "MARKET"), ("20000263", "公关媒体部", "MARKET"),
        ("20000264", "活动策划部", "MARKET"),
    ],
    "20000110": [
        ("20000265", "数据标准部", "RND"), ("20000266", "数据平台部", "RND"),
        ("20000267", "数据安全部", "RND"),
    ],
    "20000111": [
        ("20000268", "云原生研发部", "RND"), ("20000269", "前端创新部", "RND"),
        ("20000270", "测试效能部", "RND"),
    ],
    "20000112": [
        ("20000271", "政企解决方案部", "MARKET"), ("20000272", "政府事务部", "FUNCTION"),
        ("20000273", "华北研发部", "RND"),
    ],
    "20000113": [
        ("20000274", "芯片验证部", "RND"), ("20000275", "系统工程部", "RND"),
    ],
    "20000114": [
        ("20000276", "广东销售部", "MARKET"), ("20000277", "福建销售部", "MARKET"),
        ("20000278", "港澳销售部", "MARKET"),
    ],
    "20000115": [
        ("20000279", "安全运营部", "FUNCTION"), ("20000280", "应急响应部", "FUNCTION"),
    ],
}

for parent_code, depts in DEPT_TEMPLATES.items():
    for code, name, func in depts:
        loc = "SHANGHAI"
        for d in NEW_DIVISIONS:
            if d[0] == parent_code:
                loc = d[4]
                break
        add_org(code, name, parent_code, "DEPARTMENT", loc, "LE-DEFAULT", "L2", "DEPARTMENT", func)

# 三级团队（在部分二级部门下）
TEAM_PARENTS = [
    ("20000201", [("20000301", "容器平台组"), ("20000302", "微服务框架组"), ("20000303", "消息中间件组")]),
    ("20000232", [("20000304", "SMT 一线组"), ("20000305", "组装一线组"), ("20000306", "包装一线组")]),
    ("20000233", [("20000307", "CNC 加工组"), ("20000308", "注塑成型组")]),
    ("ORG-RD-PLAT", [("20000309", "API 网关组"), ("20000310", "服务治理组"), ("20000311", "可观测性组")]),
    ("ORG-RD-BIZ", [("20000312", "HR SaaS 组"), ("20000313", "财务共享组"), ("20000314", "供应链组")]),
    ("ORG-RD-DATA", [("20000315", "数据仓库组"), ("20000316", "实时计算组"), ("20000317", "BI 报表组")]),
    ("ORG-SM-EAST", [("20000318", "上海销售一组"), ("20000319", "上海销售二组"), ("20000320", "苏州销售组")]),
    ("ORG-SM-NORTH", [("20000321", "北京销售一组"), ("20000322", "天津销售组")]),
    ("20000245", [("20000323", "东南亚销售组"), ("20000324", "日韩销售组")]),
    ("20000255", [("20000325", "网络运维组"), ("20000326", "云平台组"), ("20000327", "数据库运维组")]),
    ("20000268", [("20000328", "K8s 研发组"), ("20000329", "Serverless 组")]),
    ("20000271", [("20000330", "政务云方案组"), ("20000331", "信创适配组")]),
    ("ORG-CS-ONB", [("20000332", "华东实施组"), ("20000333", "华南实施组"), ("20000334", "华北实施组")]),
    ("ORG-PD-ENT", [("20000335", "核心人事组"), ("20000336", "薪酬绩效组")]),
    ("ORG-PD-UX", [("20000337", "交互设计组"), ("20000338", "视觉设计组"), ("20000339", "用户研究组")]),
]

for parent, teams in TEAM_PARENTS:
    for code, name in teams:
        add_org(code, name, parent, "TEAM", "SHANGHAI", "LE-DEFAULT", "L3", "TEAM", "RND")

# 四级组织（制造一线）
L4_TEAMS = [
    ("20000304", [("20000401", "SMT-A 线"), ("20000402", "SMT-B 线")]),
    ("20000305", [("20000403", "组装-A 班"), ("20000404", "组装-B 班")]),
    ("20000307", [("20000405", "CNC-早班"), ("20000406", "CNC-晚班")]),
]
for parent, subs in L4_TEAMS:
    for code, name in subs:
        add_org(code, name, parent, "TEAM", "SUZHOU", "LE-DEFAULT", "L4", "TEAM", "MANUFACTURING")

# 虚拟组织样例
add_org("20000410", "数字化转型项目组", "ORG-ROOT", "DEPARTMENT", "SHANGHAI", "LE-DEFAULT", "L2", "PROJECT", "RND", "VIRTUAL")
add_org("20000411", "IPO 筹备专项组", "20000106", "TEAM", "SHANGHAI", "LE-DEFAULT", "L3", "PROJECT", "FUNCTION", "VIRTUAL")


def position_profile(org_type: str, org_func: str, idx: int) -> dict:
    if org_type in ("COMPANY", "DIVISION") or idx == 0:
        return dict(cat="MANAGEMENT", kind="OFFICE", seq="M", level="10", key="YES", ident="MANAGEMENT", name_suffix="负责人")
    if org_func == "MANUFACTURING":
        profiles = [
            dict(cat="DIRECT_WORKER_1", kind="NON_OFFICE", seq="T", level="3", key="NO", ident="DIRECT_PRODUCTION", name_suffix="操作员"),
            dict(cat="INDIRECT_WORKER", kind="NON_OFFICE", seq="T", level="5", key="NO", ident="DIRECT_SUPPORT", name_suffix="技术员"),
            dict(cat="MANAGEMENT", kind="OFFICE", seq="M", level="7", key="NO", ident="MANAGEMENT", name_suffix="主管"),
        ]
        return profiles[idx % len(profiles)]
    if org_func == "MARKET":
        profiles = [
            dict(cat="MANAGEMENT", kind="OFFICE", seq="M", level="8", key="NO", ident="MANAGEMENT", name_suffix="经理"),
            dict(cat="INDIRECT_WORKER", kind="OFFICE", seq="P", level="5", key="NO", ident="INDIRECT", name_suffix="专员"),
            dict(cat="INDIRECT_WORKER", kind="OFFICE", seq="P", level="4", key="NO", ident="INDIRECT", name_suffix="顾问"),
        ]
        return profiles[idx % len(profiles)]
    profiles = [
        dict(cat="TECHNICAL", kind="OFFICE", seq="P", level="6", key="NO", ident="INDIRECT", name_suffix="工程师"),
        dict(cat="TECHNICAL", kind="OFFICE", seq="P", level="5", key="NO", ident="INDIRECT", name_suffix="高级工程师"),
        dict(cat="MANAGEMENT", kind="OFFICE", seq="M", level="8", key="NO", ident="MANAGEMENT", name_suffix="经理"),
        dict(cat="SUPPORT", kind="OFFICE", seq="P", level="4", key="NO", ident="INDIRECT", name_suffix="专员"),
    ]
    return profiles[idx % len(profiles)]


def main() -> None:
    out_path = Path(__file__).resolve().parents[1] / "src/main/resources/db/migration/V21__demo_large_scale_data.sql"
    lines: list[str] = [
        "-- 大规模演示样例：组织(100+)、岗位(每部门)、员工档案(120+)",
        "-- 由 server/scripts/generate_demo_data.py 生成",
        "",
    ]

    # ── 组织 INSERT ──
    lines.append("-- ========== 1) 扩展组织树 ==========")
    for code, name, parent, org_type, location, legal, level, dept_type, func, attr in ORG_TREE:
        cc = f"CC-{func[:3]}-{code[-4:]}" if rng.random() < 0.3 else f"CC-{name[:4]}"
        lines.append(f"""
INSERT INTO organization (
  code, name, parent_code, parent_id, org_type, department_type, location, legal_company,
  department_level, cost_center, org_attribute, org_function, effective_start_date, effective_end_date, status
)
SELECT {esc(code)}, {esc(name)}, {esc(parent)}, p.id, {esc(org_type)}, {esc(dept_type)}, {esc(location)}, {esc(legal)},
  {esc(level)}, {esc(cc)}, {esc(attr)}, {esc(func)}, '2020-01-01', NULL, 'ACTIVE'
FROM organization p
WHERE p.code = {esc(parent)} AND p.effective_end_date IS NULL
  AND NOT EXISTS (SELECT 1 FROM organization o WHERE o.code = {esc(code)} AND o.effective_end_date IS NULL);""")

    # ── 岗位：为所有 ACTIVE 组织各生成岗位 ──
    lines.append("\n-- ========== 2) 岗位（每个部门至少 1 个，多数 2~3 个） ==========")
    pos_seq = 20010001
    org_positions: list[tuple[str, str, str]] = []  # org_code, pos_code, pos_name

    all_orgs_for_pos = [
        ("ORG-ROOT", "星河数字科技集团", "COMPANY", "FUNCTION"),
    ]
    for item in ORG_TREE:
        all_orgs_for_pos.append((item[0], item[1], item[3], item[8]))
    # V9 既有组织也需要补岗位（用 NOT EXISTS 跳过已有）
    v9_orgs = [
        ("ORG-HR", "人力资源中心", "DIVISION", "FUNCTION"),
        ("ORG-FIN", "财务与行政中心", "DIVISION", "FUNCTION"),
        ("ORG-RD", "技术研发中心", "DIVISION", "RND"),
        ("ORG-PD", "产品中心", "DIVISION", "RND"),
        ("ORG-SM", "销售与市场中心", "DIVISION", "MARKET"),
        ("ORG-CS", "客户成功中心", "DIVISION", "MARKET"),
        ("ORG-RD-SZ", "深圳研发中心", "DIVISION", "RND"),
        ("ORG-RD-CD", "成都研发中心", "DIVISION", "RND"),
        ("ORG-RD-PLAT", "平台研发部", "DEPARTMENT", "RND"),
        ("ORG-RD-BIZ", "业务研发部", "DEPARTMENT", "RND"),
        ("ORG-RD-QA", "质量保障部", "DEPARTMENT", "RND"),
        ("ORG-RD-DATA", "数据智能部", "DEPARTMENT", "RND"),
        ("ORG-PD-ENT", "企业产品部", "DEPARTMENT", "RND"),
        ("ORG-PD-CON", "消费产品部", "DEPARTMENT", "RND"),
        ("ORG-PD-UX", "体验设计部", "DEPARTMENT", "RND"),
        ("ORG-SM-EAST", "华东销售部", "DEPARTMENT", "MARKET"),
        ("ORG-SM-NORTH", "华北销售部", "DEPARTMENT", "MARKET"),
        ("ORG-SM-SOUTH", "华南销售部", "DEPARTMENT", "MARKET"),
        ("ORG-SM-MKT", "市场营销部", "DEPARTMENT", "MARKET"),
        ("ORG-HR-COE", "HR COE 组", "DEPARTMENT", "FUNCTION"),
        ("ORG-HR-BP", "HRBP 组", "DEPARTMENT", "FUNCTION"),
        ("ORG-FIN-ACC", "财务会计部", "DEPARTMENT", "FUNCTION"),
        ("ORG-FIN-ADM", "行政办公部", "DEPARTMENT", "FUNCTION"),
        ("ORG-CS-ONB", "实施交付部", "DEPARTMENT", "MARKET"),
        ("ORG-CS-SUP", "客户支持部", "DEPARTMENT", "MARKET"),
        ("ORG-RD-PLAT-BE", "平台后端组", "TEAM", "RND"),
        ("ORG-RD-PLAT-FE", "平台前端组", "TEAM", "RND"),
        ("ORG-RD-CD-BE", "成都后端组", "TEAM", "RND"),
        ("ORG-RD-CD-FE", "成都前端组", "TEAM", "RND"),
    ]
    seen = {o[0] for o in all_orgs_for_pos}
    for o in v9_orgs:
        if o[0] not in seen:
            all_orgs_for_pos.append(o)

    for org_code, org_name, org_type, org_func in all_orgs_for_pos:
        count = 1 if org_type == "COMPANY" else (2 if org_type == "TEAM" and org_code.startswith("200004") else 3)
        for i in range(count):
            prof = position_profile(org_type, org_func, i)
            pname = f"{org_name}{prof['name_suffix']}"
            if i > 0:
                pname = f"{org_name}{prof['name_suffix']}{i + 1}"
            pcode = str(pos_seq)
            pos_seq += 1
            org_positions.append((org_code, pcode, pname))
            lines.append(f"""
INSERT INTO position (
  code, name, organization_id, effective_start_date, effective_end_date, status,
  occupational_disease, position_category, position_kind, position_sequence, position_level, key_position, identity_category
)
SELECT {esc(pcode)}, {esc(pname)}, o.id, '2020-01-01', NULL, 'ACTIVE',
  'NO', {esc(prof['cat'])}, {esc(prof['kind'])}, {esc(prof['seq'])}, {esc(prof['level'])}, {esc(prof['key'])}, {esc(prof['ident'])}
FROM organization o
WHERE o.code = {esc(org_code)} AND o.effective_end_date IS NULL
  AND NOT EXISTS (SELECT 1 FROM position p WHERE p.code = {esc(pcode)} AND p.effective_start_date = '2020-01-01');""")

    # ── 员工 ──
    lines.append("\n-- ========== 3) 员工主档与档案子表（120 人） ==========")
    employee_count = 120
    assignable = [(oc, pc, pn) for oc, pc, pn in org_positions if not oc.startswith("ORG-ROOT")]

    marital = ["SINGLE", "MARRIED", "MARRIED", "DIVORCED"]
    political = ["MASSES", "LEAGUE", "PARTY", "MASSES"]
    education = ["BACHELOR", "MASTER", "BACHELOR", "PHD", "COLLEGE"]
    fertility = ["NONE", "ONE_CHILD", "TWO_CHILDREN", "NONE"]
    ethnicity = ["HAN", "HAN", "HAN", "HUI", "ZHUANG", "MIAO"]
    household = ["URBAN", "RURAL", "URBAN"]
    relations = ["SPOUSE", "PARENT", "SIBLING", "CHILD"]

    for i in range(employee_count):
        male = i % 3 != 1
        name = gen_name(male)
        gender = "MALE" if male else "FEMALE"
        birth = date(1985, 1, 1) + timedelta(days=rng.randint(0, 5500))
        hire = date(2018, 1, 1) + timedelta(days=(i * 23) % 2800)
        emp_no = f"{hire.strftime('%y%m')}{(i + 1):04d}"
        mobile_plain = gen_mobile(10000 + i)
        mobile_enc = encrypt(mobile_plain)
        id_plain = gen_id_card(birth, i)
        id_enc = encrypt(id_plain)
        account_plain = f"622202{rng.randint(100000000000, 999999999999)}"
        account_enc = encrypt(account_plain)
        ss_plain = f"SS{hire.year}{i:08d}"
        ss_enc = encrypt(ss_plain)

        city_key = rng.choice(list(CITIES.keys()))
        addr1, addr2 = CITIES[city_key]
        pinyin = ["zhang", "wang", "li", "liu", "chen", "yang", "zhao", "huang", "wu", "zhou"][i % 10]
        ad = f"{pinyin}{i + 1}"
        email = f"{ad}@starriver-tech.com"
        personal_email = f"{ad}{i}@163.com"

        org_code, pos_code, pos_name = assignable[i % len(assignable)]
        school, major, edu_level, edu_label = rng.choice(SCHOOLS)
        work_start = birth + timedelta(days=rng.randint(7500, 9000))

        lines.append(f"""
-- 员工 {i + 1}: {name} ({emp_no})
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
  {esc(rng.choice(education))}, {sql_date(hire - timedelta(days=rng.randint(30, 900)))}, {esc(rng.choice(fertility))},
  {esc(rng.choice(ethnicity))}, {esc(rng.choice(['跑步', '阅读', '摄影', '羽毛球', '烘焙', '徒步', '围棋', '吉他']))},
  'CHINA', {esc(rng.choice(household))}, {esc(addr1)}, {1 if rng.random() < 0.25 else 0},
  {sql_date(work_start)},
  {esc(mobile_enc)}, {esc(email)}, {esc(personal_email)}, {esc(f'wx_{ad}')},
  {esc(f'021-5888{1000 + i:04d}')}, {esc(str(8000 + i))}, {esc(f'021-555{1000 + i:04d}')},
  {esc(addr1)}, {esc(addr2)},
  {esc(gen_name(not male))}, {esc(gen_mobile(20000 + i))}, {esc(rng.choice(relations))},
  {esc(rng.choice(['CAMPUS', 'REFERRAL', 'HEADHUNTER', 'BOSS', 'INTERNAL']))},
  {esc(rng.choice(['清华大学校招', '员工内推', '猎聘', 'BOSS直聘', '智联招聘']))},
  {sql_date(hire)},
  {sql_date(hire)}, {esc(rng.choice(['ACTIVE', 'ACTIVE', 'ACTIVE', 'PROBATION']))}
WHERE NOT EXISTS (SELECT 1 FROM employee e WHERE e.employee_no = {esc(emp_no)});""")

        lines.append(f"""
INSERT INTO employee_id_document (employee_id, country_region, id_type, id_number, valid_from, valid_to, is_primary)
SELECT e.id, 'CHINA', 'ID_CARD', {esc(id_enc)}, {sql_date(birth + timedelta(days=6570))}, {sql_date(birth + timedelta(days=365 * 50))}, 1
FROM employee e WHERE e.employee_no = {esc(emp_no)}
  AND NOT EXISTS (SELECT 1 FROM employee_id_document d WHERE d.employee_id = e.id AND d.is_primary = 1);""")

        lines.append(f"""
INSERT INTO employee_family_member (employee_id, name, relation, is_internal_employee, phone, employer, position, birth_date)
SELECT e.id, {esc(gen_name(not male))}, 'SPOUSE', 0, {esc(gen_mobile(30000 + i))}, {esc(rng.choice(COMPANIES_PREV))}, {esc('工程师')}, {sql_date(birth + timedelta(days=rng.randint(0, 800)))}
FROM employee e WHERE e.employee_no = {esc(emp_no)}
  AND NOT EXISTS (SELECT 1 FROM employee_family_member f WHERE f.employee_id = e.id AND f.relation = 'SPOUSE');""")

        if i % 4 == 0:
            lines.append(f"""
INSERT INTO employee_family_member (employee_id, name, relation, is_internal_employee, phone, birth_date)
SELECT e.id, {esc(gen_name(rng.random() < 0.5))}, 'CHILD', 0, NULL, {sql_date(date(2015, 1, 1) + timedelta(days=rng.randint(0, 3000)))}
FROM employee e WHERE e.employee_no = {esc(emp_no)}
  AND NOT EXISTS (SELECT 1 FROM employee_family_member f WHERE f.employee_id = e.id AND f.relation = 'CHILD');""")

        lines.append(f"""
INSERT INTO employee_assignment (
  employee_id, organization_id, position_id, employment_type, employment_sub_type, employee_nature,
  contract_location, work_location, is_primary, is_responsibility_system, is_management_cadre, is_core_talent,
  special_tags, group_attr_level, payroll_company_id, cost_legal_entity_id, salary_group,
  business_unit, legal_entity_id, group_name, business_group, system_name, center_name, department_name,
  team_name, probation_period, expected_regularization_date, actual_regularization_date,
  group_seniority_start_date, group_responsibility_start_date, tenure_on_position, company_tenure,
  hr_coordinator_no, hrbp_no, ssc_no, effective_start_date, effective_end_date, status
)
SELECT e.id, o.id, p.id, {esc(rng.choice(['FULL_TIME', 'FULL_TIME', 'INTERN', 'CONTRACT']))}, 'REGULAR',
  'INTERNAL', {esc(city_key)}, {esc(city_key)}, 1,
  {1 if i % 7 == 0 else 0}, {1 if i % 15 == 0 else 0}, {1 if i % 11 == 0 else 0},
  {esc('核心骨干' if i % 11 == 0 else '')}, {esc(rng.choice(['A', 'B', 'C']))},
  le.id, le.id, {esc(rng.choice(['SG-SH', 'SG-SZ', 'SG-CD', 'SG-MFG']))},
  {esc('星河数字科技')}, le.id, '星河集团', {esc(rng.choice(['数字科技事业群', '智能制造事业群', '国际业务事业群']))},
  {esc(rng.choice(['研发体系', '营销体系', '职能体系']))}, {esc(org_code[:20])}, {esc(pos_name)},
  {esc(org_code if org_code.startswith('200003') else '')},
  {esc('3个月' if i % 20 == 0 else '6个月')},
  {sql_date(hire + timedelta(days=90)) if i % 20 == 0 else 'NULL'},
  {sql_date(hire + timedelta(days=180)) if i % 20 != 0 else 'NULL'},
  {sql_date(hire)}, {sql_date(hire)},
  {esc(f'{rng.randint(1,8)}年{rng.randint(0,11)}个月')}, {esc(f'{rng.randint(1,10)}年{rng.randint(0,11)}个月')},
  {esc(f'HC{i % 5 + 1:03d}')}, {esc(f'BP{i % 8 + 1:03d}')}, {esc(f'SSC{i % 3 + 1:03d}')},
  {sql_date(hire)}, NULL, 'ACTIVE'
FROM employee e
JOIN organization o ON o.code = {esc(org_code)} AND o.effective_end_date IS NULL
JOIN position p ON p.code = {esc(pos_code)} AND p.effective_end_date IS NULL
JOIN legal_entity le ON le.code = 'LE-DEFAULT'
WHERE e.employee_no = {esc(emp_no)}
  AND NOT EXISTS (SELECT 1 FROM employee_assignment a WHERE a.employee_id = e.id AND a.is_primary = 1 AND a.effective_end_date IS NULL);""")

        if i > 0:
            mgr_idx = max(0, i - 1 - (i % 7))
            hire_mgr = date(2018, 1, 1) + timedelta(days=(mgr_idx * 23) % 2800)
            mgr_emp_no = f"{hire_mgr.strftime('%y%m')}{(mgr_idx + 1):04d}"
            lines.append(f"""
INSERT INTO reporting_line (employee_id, manager_employee_id, line_type, effective_start_date, effective_end_date)
SELECT e.id, m.id, 'DIRECT', {sql_date(hire)}, NULL
FROM employee e
JOIN employee m ON m.employee_no = {esc(mgr_emp_no)}
WHERE e.employee_no = {esc(emp_no)}
  AND e.id <> m.id
  AND NOT EXISTS (SELECT 1 FROM reporting_line r WHERE r.employee_id = e.id AND r.line_type = 'DIRECT' AND r.effective_end_date IS NULL);""")

        lines.append(f"""
INSERT INTO employee_movement (
  employee_id, movement_type, movement_type_name, reason_code, reason_description, effective_date, remark
)
SELECT e.id, 'HIR', '雇佣', 'H01', '初次入职', {sql_date(hire)}, {esc(f'{name} 加入星河数字科技')}
FROM employee e WHERE e.employee_no = {esc(emp_no)}
  AND NOT EXISTS (SELECT 1 FROM employee_movement m WHERE m.employee_id = e.id AND m.movement_type = 'HIR');""")

        lines.append(f"""
INSERT INTO employee_cost_center_allocation (employee_id, legal_entity_id, cost_center, percentage, effective_start_date)
SELECT e.id, le.id, {esc(f'CC-{org_code[-4:]}')}, 100.00, {sql_date(hire)}
FROM employee e JOIN legal_entity le ON le.code = 'LE-DEFAULT'
WHERE e.employee_no = {esc(emp_no)}
  AND NOT EXISTS (SELECT 1 FROM employee_cost_center_allocation c WHERE c.employee_id = e.id);""")

        lines.append(f"""
INSERT INTO employee_contract (
  employee_id, contract_code, contract_type, legal_entity_id, operation_type,
  start_date, end_date, effective_date, status, remark
)
SELECT e.id, {esc(f'CT-{emp_no}')}, 'LABOR', le.id, 'NEW',
  {sql_date(hire)}, {sql_date(hire + timedelta(days=365 * 3))}, {sql_date(hire)}, 'ACTIVE', '劳动合同'
FROM employee e JOIN legal_entity le ON le.code = 'LE-DEFAULT'
WHERE e.employee_no = {esc(emp_no)}
  AND NOT EXISTS (SELECT 1 FROM employee_contract c WHERE c.employee_id = e.id);""")

        if i % 3 == 0:
            lines.append(f"""
INSERT INTO employee_agreement (employee_id, agreement_type, legal_entity_id, start_date, end_date, status, remark)
SELECT e.id, 'NDA', le.id, {sql_date(hire)}, {sql_date(hire + timedelta(days=365 * 5))}, 'ACTIVE', '保密协议'
FROM employee e JOIN legal_entity le ON le.code = 'LE-DEFAULT'
WHERE e.employee_no = {esc(emp_no)}
  AND NOT EXISTS (SELECT 1 FROM employee_agreement a WHERE a.employee_id = e.id AND a.agreement_type = 'NDA');""")

        lines.append(f"""
INSERT INTO employee_attendance_card (employee_id, card_no, device_id, work_location, effective_start_date, status, remark)
SELECT e.id, {esc(f'AC{emp_no}')}, {esc(f'DEV-{city_key}')}, {esc(city_key)}, {sql_date(hire)}, 'ACTIVE', '考勤卡'
FROM employee e WHERE e.employee_no = {esc(emp_no)}
  AND NOT EXISTS (SELECT 1 FROM employee_attendance_card a WHERE a.employee_id = e.id);""")

        bank_name, cnaps = rng.choice(BANKS)
        lines.append(f"""
INSERT INTO employee_bank_account (
  employee_id, account_type, country_code, account_no, account_name, currency_code, cnaps_code, is_primary
)
SELECT e.id, 'SALARY', 'CN', {esc(account_enc)}, {esc(name)}, 'CNY', {esc(cnaps)}, 1
FROM employee e WHERE e.employee_no = {esc(emp_no)}
  AND NOT EXISTS (SELECT 1 FROM employee_bank_account b WHERE b.employee_id = e.id AND b.is_primary = 1);""")

        lines.append(f"""
INSERT INTO employee_social_insurance (
  employee_id, social_security_no, social_base, housing_fund_no, housing_base, company, insurance_region, is_company_payroll
)
SELECT e.id, {esc(ss_enc)}, {rng.randint(8000, 35000)}.00, {esc(f'HF{emp_no}')}, {rng.randint(8000, 35000)}.00,
  '星河数字科技有限公司', {esc(city_key)}, 1
FROM employee e WHERE e.employee_no = {esc(emp_no)}
  AND NOT EXISTS (SELECT 1 FROM employee_social_insurance s WHERE s.employee_id = e.id);""")

        if i % 5 == 0:
            lines.append(f"""
INSERT INTO employee_special_benefit (
  employee_id, benefit_type, benefit_name, amount, currency_code, effective_start_date, remark
)
SELECT e.id, 'MEAL', '餐补', 600.00, 'CNY', {sql_date(hire)}, '月度餐补'
FROM employee e WHERE e.employee_no = {esc(emp_no)}
  AND NOT EXISTS (SELECT 1 FROM employee_special_benefit b WHERE b.employee_id = e.id AND b.benefit_type = 'MEAL');""")

        if i % 6 == 0:
            lines.append(f"""
INSERT INTO employee_commute_accommodation (employee_id, record_type, route_or_address, effective_start_date, remark)
SELECT e.id, 'SHUTTLE', {esc(f'{city_key} 班车 {rng.randint(1,5)} 号线')}, {sql_date(hire)}, '通勤班车'
FROM employee e WHERE e.employee_no = {esc(emp_no)}
  AND NOT EXISTS (SELECT 1 FROM employee_commute_accommodation c WHERE c.employee_id = e.id AND c.record_type = 'SHUTTLE');""")

        lines.append(f"""
INSERT INTO employee_education (
  employee_id, degree, education_level, is_highest, country_region, school_name, major, start_date, end_date, diploma_no
)
SELECT e.id, {esc(edu_label)}, {esc(edu_level)}, 1, 'CHINA', {esc(school)}, {esc(major)},
  {sql_date(hire - timedelta(days=rng.randint(1500, 2500)))}, {sql_date(hire - timedelta(days=rng.randint(30, 400)))},
  {esc(f'DIP-{emp_no}')}
FROM employee e WHERE e.employee_no = {esc(emp_no)}
  AND NOT EXISTS (SELECT 1 FROM employee_education ed WHERE ed.employee_id = e.id AND ed.is_highest = 1);""")

        prev_co = rng.choice(COMPANIES_PREV)
        lines.append(f"""
INSERT INTO employee_work_experience (
  employee_id, employer_name, department, position, start_date, end_date, leave_reason, last_salary, referee, referee_phone, currency_code
)
SELECT e.id, {esc(prev_co)}, {esc('研发中心')}, {esc('高级工程师')},
  {sql_date(hire - timedelta(days=rng.randint(900, 2000)))}, {sql_date(hire - timedelta(days=30))},
  {esc('职业发展')}, {rng.randint(15000, 45000)}.00, {esc(gen_name(True))}, {esc(gen_mobile(40000 + i))}, 'CNY'
FROM employee e WHERE e.employee_no = {esc(emp_no)}
  AND NOT EXISTS (SELECT 1 FROM employee_work_experience w WHERE w.employee_id = e.id);""")

        if i % 4 == 0:
            lines.append(f"""
INSERT INTO employee_qualification (
  employee_id, title_name, title_level, approval_date, certificate_no, issuing_org
)
SELECT e.id, {esc(rng.choice(['软件设计师', '项目管理师', '人力资源管理师', '经济师']))},
  {esc(rng.choice(['中级', '高级']))}, {sql_date(hire - timedelta(days=400))}, {esc(f'CERT-{emp_no}')}, {esc('工业和信息化部')}
FROM employee e WHERE e.employee_no = {esc(emp_no)}
  AND NOT EXISTS (SELECT 1 FROM employee_qualification q WHERE q.employee_id = e.id);""")

        if i % 8 == 0:
            lines.append(f"""
INSERT INTO employee_reward (
  employee_id, effective_date, type, level, amount, issuing_org, description
)
SELECT e.id, {sql_date(hire + timedelta(days=365))}, 'PERFORMANCE', 'COMPANY', 5000.00, '星河数字科技集团', '年度优秀员工'
FROM employee e WHERE e.employee_no = {esc(emp_no)}
  AND NOT EXISTS (SELECT 1 FROM employee_reward r WHERE r.employee_id = e.id);""")

        lines.append(f"""
INSERT INTO employee_training_record (
  employee_id, training_name, training_type, provider, start_date, end_date, hours, result, certificate_no
)
SELECT e.id, {esc(rng.choice(['新员工入职培训', '信息安全意识培训', '领导力发展营', '敏捷实践工作坊']))},
  'ONBOARDING', '星河学院', {sql_date(hire + timedelta(days=7))}, {sql_date(hire + timedelta(days=14))},
  16.0, 'PASS', {esc(f'TR-{emp_no}')}
FROM employee e WHERE e.employee_no = {esc(emp_no)}
  AND NOT EXISTS (SELECT 1 FROM employee_training_record t WHERE t.employee_id = e.id);""")

        lines.append(f"""
INSERT INTO employee_performance_record (
  employee_id, period, rating, rating_label, score, reviewer_name, review_date, source_type
)
SELECT e.id, '2025-H2', {esc(rng.choice(['A', 'B', 'B+', 'A-']))}, {esc(rng.choice(['优秀', '良好', '良好+']))},
  {rng.randint(80, 98)}.00, {esc(gen_name(True))}, '2025-12-31', 'MANUAL'
FROM employee e WHERE e.employee_no = {esc(emp_no)}
  AND NOT EXISTS (SELECT 1 FROM employee_performance_record p WHERE p.employee_id = e.id AND p.period = '2025-H2');""")

        lines.append(f"""
INSERT INTO employee_values_assessment (
  employee_id, period, dimension, score, level, assessor_name, assess_date
)
SELECT e.id, '2025', '客户第一', {rng.randint(80, 95)}.0, 'HIGH', {esc(gen_name(True))}, '2025-12-15'
FROM employee e WHERE e.employee_no = {esc(emp_no)}
  AND NOT EXISTS (SELECT 1 FROM employee_values_assessment v WHERE v.employee_id = e.id AND v.dimension = '客户第一');""")

        if i % 6 == 0:
            lines.append(f"""
INSERT INTO employee_talent_review (
  employee_id, review_cycle, grid_position, potential_level, performance_level, reviewer_name, review_date
)
SELECT e.id, '2025', {esc(rng.choice(['9-BOX-高潜', '9-BOX-核心', '9-BOX-稳定']))},
  {esc(rng.choice(['HIGH', 'MEDIUM']))}, {esc(rng.choice(['HIGH', 'MEDIUM']))}, {esc(gen_name(True))}, '2025-11-30'
FROM employee e WHERE e.employee_no = {esc(emp_no)}
  AND NOT EXISTS (SELECT 1 FROM employee_talent_review t WHERE t.employee_id = e.id AND t.review_cycle = '2025');""")

        lines.append(f"""
INSERT INTO employee_project (
  employee_id, project_name, project_code, role, start_date, end_date, contribution
)
SELECT e.id, {esc(rng.choice(['星河HR中台', '智能制造MES', '海外CRM升级', '数据治理平台']))},
  {esc(f'PRJ-{emp_no[:6]}')}, {esc(rng.choice(['开发', '产品', '测试', '项目经理']))},
  {sql_date(hire + timedelta(days=60))}, NULL, {esc('核心模块交付')}
FROM employee e WHERE e.employee_no = {esc(emp_no)}
  AND NOT EXISTS (SELECT 1 FROM employee_project p WHERE p.employee_id = e.id);""")

        if i % 10 == 0:
            lines.append(f"""
INSERT INTO employee_agent_assignment (
  employee_id, agent_id, agent_name, assignment_type, effective_start_date, remark
)
SELECT e.id, {esc(f'AGT-{i:04d}')}, {esc(rng.choice(['招聘助手', '考勤机器人', '知识库助手']))}, 'COPILOT', {sql_date(hire)}, '智能体归属'
FROM employee e WHERE e.employee_no = {esc(emp_no)}
  AND NOT EXISTS (SELECT 1 FROM employee_agent_assignment a WHERE a.employee_id = e.id);""")

    # 更新编码规则游标
    max_dept = max(int(o[0]) for o in ORG_TREE if o[0].isdigit())
    lines.append(f"""
-- ========== 4) 更新编码规则游标 ==========
UPDATE code_rule SET last_seq = GREATEST(last_seq, {max_dept}) WHERE code = 'DEPT_CODE';
UPDATE code_rule SET last_seq = GREATEST(last_seq, {pos_seq - 1}) WHERE code = 'POSITION_CODE';
""")

    out_path.write_text("\n".join(lines), encoding="utf-8")
    print(f"Generated: {out_path}")
    print(f"Organizations (new): {len(ORG_TREE)}")
    print(f"Positions: {len(org_positions)}")
    print(f"Employees: {employee_count}")


if __name__ == "__main__":
    main()
