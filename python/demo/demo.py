import xnode as xn
from demo_classes import Company

if __name__ == '__main__':
    company = Company("Xnode, Inc.")
    loc = company.add_location("Stanford")

    employees = loc.import_employees("employees.tsv")
    # print(employees)
    xn.show(employees)
    # xn.show([e for idx, e in enumerate(employees.values()) if idx <= 50])
    #
    # products = loc.import_products("products.tsv")
    # xn.show(products)

    # assert False
    # loc.update_inventory(1525, 30)
    # loc.update_inventory(5220, 50)

    # xn.show(company)
    # xn.show(Company)
    #
    # def hi(a, b, c="4", d="herro", e=None):
    #     pass
    # xn.show(hi)
    # xn.show(lambda x=None: x + 1)
