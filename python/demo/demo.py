import xnode_old as xn
from demo_classes import Company, import_employees, import_products

if __name__ == '__main__':
    employees = import_employees("employees.tsv")
    products = import_products("products.tsv")
    company = Company("Xnode, Inc.")
    loc = company.add_location("Stanford", employees, products)
    loc.update_inventory(1525, 30)
    loc.update_inventory(5220, 50)

    xn.show(company)

    loc.update_inventory(1517, 20)

    xn.show(company)
