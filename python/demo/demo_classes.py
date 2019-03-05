import xnode as xn

def import_employees(filepath):
    employees = {}
    with open(filepath, 'r') as f:
        for line in f:
            employee_id, first_name, last_name, position, birthday, email, photo_path = line.strip().split("\t")
            year, month, day = birthday.split('-')
            birthday = (int(year), int(month), int(day))
            employees[int(employee_id)] = Employee(int(employee_id), first_name, last_name, position, birthday,
                                                   email, photo_path)
    return employees


class Employee:

    def __init__(
            self,
            employee_id,
            first_name,
            last_name,
            position,
            birthday,
            email,
            photo_path,
    ):
        self.employee_id = employee_id
        self.first_name = first_name
        self.last_name = last_name
        self.position = position
        self.birthday = birthday
        self.email = email
        self.photo_path = 'photos/' + photo_path

    def __view__(self):
        y, m, d = self.birthday
        return (
            xn.Sequence([
                xn.Image(self.photo_path),
                xn.Text('{}, {}'.format(self.last_name, self.first_name)),
                xn.Text('employee ID: {}'.format(self.employee_id)),
                xn.Text('position: {}'.format(self.position)),
                xn.Text('birthday: {}/{}/{}'.format(m, d, y))
            ], orientation='vertical')
        )




class Company:

    def __init__(self, name):
        self.name = name
        self.locations = {}  # location_id (str) -> Location

    def get_num_locations(self):
        return len(self.locations)

    def get_num_employees(self):
        return sum(len(loc.employees) for loc in self.locations.values())

    def get_location(self, location_id):
        return self.locations[location_id] if location_id in self.locations else None

    def get_locations_with_product(self, product_id):
        return [loc for loc in self.locations.values() if loc.has_in_stock(product_id)]

    def get_location_of_employee(self, employee_id):
        for loc in self.locations.values():
            if loc.has_employee(employee_id):
                return loc
        return None

    def add_location(self, location_id, employees, products):
        if location_id in self.locations: return self.locations[location_id]
        self.locations[location_id] = Location(location_id, employees, products)
        return self.locations[location_id]


class Location:

    def __init__(self, location_id, employees, products):
        self.location_id = location_id
        self.employees = employees  # employee_id (int) -> Employee
        self.products = products  # product_id (int) -> Product
        self.inventory = {}  # product_id (int) -> Inventory

    def has_in_stock(self, product_id):
        if product_id not in self.inventory: return False
        return self.inventory[product_id].quantity > 0

    def has_employee(self, employee_id):
        return employee_id in self.employees

    def update_inventory(self, product_id, quantity):
        if product_id in self.products:
            self.inventory[product_id] = Inventory(product_id, quantity)


def import_products(filepath):
    products = {}
    with open(filepath, 'r') as f:
        for line in f:
            product_id, name, description, price = line.strip().split("\t")
            products[int(product_id)] = Product(int(product_id), name, float(price), description)
    return products


class Product:

    def __init__(self, product_id, name, price, description=None):
        self.product_id = product_id
        self.name = name
        self.price = price
        self.description = description


class Inventory:

    def __init__(self, product_id, quantity):
        self.product_id = product_id
        self.quantity = quantity
