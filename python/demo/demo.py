import xnode as xn
from demo_classes import Company

if __name__ == '__main__':
    company = Company("Xnode, Inc.")
    loc = company.add_location("Stanford")
    employees = loc.import_employees("employees.tsv")
    xn.show(employees)
    products = loc.import_products("products.tsv")
    xn.show(products)
