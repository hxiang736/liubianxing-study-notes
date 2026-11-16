# Python 数据清洗 连接与聚合

把几次 pandas 排错整理成一条可复用的思路：按字段含义清洗，校验连接关系，再用手算结果检验汇总。

整理日期 2026-11-16

## 先按含义区分字段

字段看起来像数字，不代表它可以参与数值计算。历史讨论中明确纠正过：用户标识应当按文本处理，不能被自动归入中位数填补。金额则应保持数值类型。

给字段写清用途，再决定类型和缺失策略。UNKNOWN 可以作为缺失标识的展示文字，但不能因此把所有未知用户当成同一个业务对象，也不宜直接把这个占位文本用作关联或去重依据。

- 标识字段：关注格式、前导零、空白与唯一性。
- 数值字段：关注单位、可转换性、缺失和异常范围。
- 状态字段：先定义哪些状态有效，再用于筛选与汇总。

## 数值转换之后 仍要检查填充顺序

一次排错中，to_numeric 已完成转换，后续填充逻辑却把金额缺失值替换成 UNKNOWN，破坏了数值列。因此问题不一定在转换函数，也可能出在后面的覆盖操作。

errors='coerce' 会将无法转换的内容变成缺失值。转换前后的缺失数量应分别记录，避免把输入错误与原始缺失混为一谈。下面只示范练习中已约定的中位数填补；它会改变汇总金额，不能直接作为正式交易数据的通用规则。整列缺失、算不出中位数时保留缺失值。


```
import pandas as pd

# 泛化示例，不是真实交易数据
demo = pd.DataFrame({'amount': ['100', None, '200']})
cleaned = demo.copy()
amount = pd.to_numeric(cleaned['amount'], errors='coerce')
median_value = amount.median()
if pd.notna(median_value):
    amount = amount.fillna(median_value)
cleaned['amount'] = amount

# 缺失金额在这个示例中变为 150，数值列不填文本
print(cleaned)
```

## 关联前声明关系 关联后检查未匹配

订单关联用户信息通常预期是多对一：同一用户可以有多笔订单，但用户信息表的关联键应唯一。validate='many_to_one' 会检查右表键的唯一性，避免悄悄产生重复匹配。indicator=True 可标出 both 和 left_only 等匹配状态。

还要先处理空关联键：pandas 会让左右两表的空键互相匹配，这与通常的 SQL 空值连接不同。下面的示例没有空键；真实数据应先明确空键的处理规则。


```
# 泛化示例：U9 在用户信息表中没有对应记录
orders = pd.DataFrame({
    'order_id': [1, 2, 3],
    'user_id': ['U1', 'U2', 'U9'],
    'amount': [100, 200, 50],
    'status': ['paid', 'cancelled', 'completed']
})
users = pd.DataFrame({
    'user_id': ['U1', 'U2'],
    'city': ['甲城', '乙城']
})
merged = orders.merge(
    users, on='user_id', how='left',
    validate='many_to_one', indicator=True
)
unmatched = merged.loc[merged['_merge'] == 'left_only']
assert len(merged) == len(orders)
print(unmatched[['order_id', 'user_id']])
```

## 先筛选有效记录 再分组聚合

接着上面的示例，假设 paid 和 completed 计入有效订单。用命名聚合同时生成订单数、成交额和平均订单金额，让列名直接表达含义。订单编号须先完成唯一性与非空校验，金额也须按既定规则处理后再聚合。

groupby 默认不把空分组键纳入分组。若要保留城市未知的有效订单，可显式使用 dropna=False，并把未知城市留作待补充项，而不是让这些订单消失。


```
valid = merged.loc[
    merged['status'].isin(['paid', 'completed'])
].copy()

summary = valid.groupby('city', as_index=False, dropna=False).agg(
    order_count=('order_id', 'size'),
    revenue=('amount', 'sum'),
    avg_order_amount=('amount', 'mean')
)

# 此示例为 2 笔有效订单，总金额 150；其中 1 笔城市未知
print(summary)
```

## 把处理过程变成可调用的函数

练习中的处理顺序可以整理为：复制输入，校验字段与类型，筛选有效记录，处理空结果，聚合，检查结果，返回数据。定义函数不会自动执行，传入参数调用时才运行。

函数应返回结果或明确的错误，而不只打印中间表。需要输出逐行记录时，可用 to_dict(orient='records')。没有有效订单可以作为正常空结果返回；输入缺字段、重复键等则应按约定报错。

- 必需字段用集合求差检查，缺失时给出清楚提示。
- 异常范围按业务定义：练习可以拒绝负金额，退款业务则需要另外的口径。
- 避免同一套校验重复写两遍，也避免函数内部修改调用方的原始表。

## 汇总一致 还要与手算答案一致

汇总前后的总数或总金额一致，只说明某些内部关系成立。即使筛选条件写错，两个错误结果仍可能相互一致。因此还要准备一个可手算的小样例，检查具体分组的结果。

订单数可精确比较；浮点金额或平均值可结合业务精度用 math.isclose 检查。容差只用于比较，不会改写或四舍五入原始金额。空结果时先返回或单独处理，避免在加权平均校验中除以零。

- 正常样例：逐组核对订单数、成交额和均值。
- 异常样例：缺字段、重复关联键、无法转换的金额。
- 边界样例：空表、全部订单无效、没有匹配到用户的订单。
- 复用检查：重复调用结果一致，输入表未被修改。
- 记录本轮覆盖了什么；一轮验收通过不等于所有未知输入都已验证。

## 查阅文档

- [pandas 数值转换](https://pandas.pydata.org/docs/reference/api/pandas.to_numeric.html)
- [pandas 连接校验与匹配标记](https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.merge.html)
- [pandas 命名聚合与空分组键](https://pandas.pydata.org/docs/user_guide/groupby.html)
- [Python 浮点数近似比较](https://docs.python.org/3/library/math.html#math.isclose)
