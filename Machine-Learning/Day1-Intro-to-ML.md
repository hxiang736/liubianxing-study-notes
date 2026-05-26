# Day 1 - Intro to Machine Learning

## What I Learned

Today I learned the basic workflow of machine learning using Kaggle Learn.

Main topics:

- Loading data with pandas
- Features and target variables
- Decision Tree models
- fit() and predict()
- Missing values
- Model training process

---

# 1. Loading Data

```python
import pandas as pd

home_data = pd.read_csv('../input/home-data-for-ml-course/train.csv')
```

`pd.read_csv()` is used to load CSV files into a DataFrame.

---

# 2. Viewing Data

```python
home_data.head()
```

View the first 5 rows.

```python
home_data.columns
```

View all column names.

---

# 3. Prediction Target

The prediction target is usually called `y`.

```python
y = home_data.SalePrice
```

In this project:

- `SalePrice` = target variable
- Goal = predict house prices

---

# 4. Features

Features are input variables used to make predictions.

```python
feature_names = [
    'LotArea',
    'YearBuilt',
    '1stFlrSF',
    '2ndFlrSF',
    'FullBath',
    'BedroomAbvGr',
    'TotRmsAbvGrd'
]

X = home_data[feature_names]
```

---

# 5. Missing Values

Missing values are represented as:

```python
NaN
```

Remove missing rows:

```python
melbourne_data = melbourne_data.dropna(axis=0)
```

---

# 6. Decision Tree

A decision tree makes predictions by repeatedly splitting data based on conditions.

Example:

```text
Area > 150?
├── Yes → Higher price
└── No → Continue splitting
```

---

# 7. Building a Model

```python
from sklearn.tree import DecisionTreeRegressor

model = DecisionTreeRegressor(random_state=1)
```

`random_state` ensures reproducible results.

---

# 8. Training the Model

```python
model.fit(X, y)
```

The model learns patterns from historical data.

---

# 9. Making Predictions

```python
model.predict(X.head())
```

Workflow:

```text
Features → Model → Predictions
```

---

# 10. Important Concepts

| Term | Meaning |
|---|---|
| feature | Input variable |
| target | Variable to predict |
| fit | Train the model |
| predict | Make predictions |
| random_state | Random seed |
| missing value | Unrecorded data |

---

# My Understanding

Machine learning is essentially:

> Learning patterns from historical data and using them to predict unknown outcomes.

