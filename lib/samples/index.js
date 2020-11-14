// NORTHWIND
const __customers = require('./northwind/customers.json');
const __categories = require('./northwind/categories.json');
const __employees = require('./northwind/employees.json');
const __orders = require('./northwind/orders.json');
const __products = require('./northwind/products.json');
const __regions = require('./northwind/regions.json');
const __shippers = require('./northwind/shippers.json');
const __suppliers = require('./northwind/suppliers.json');
// ITALIA
const __regioni = require('./italia/regioni.json');
const __comuni = require('./italia/comuni.json');
// NATIONS
const __countries = require('./nations/countries.json');
const __nations = require('./nations/nations.json');


module.exports = {
  northwind: {
    customers: __customers['default'],
    categories: __categories['default'],
    employees: __employees['default'],
    orders: __orders['default'],
    products: __products['default'],
    regions: __regions['default'],
    shippers: __shippers['default'],
    suppliers: __suppliers['default'],
  },
  italia: {
    regioni: __regioni['default'],
    comuni: __comuni['default']
  },
  nations: {
    countries: __countries['default'],
    nations: __nations['default']
  }
}
