const path = require("path");

// Use the existing order data
const orders = require(path.resolve("src/data/orders-data"));

// Use this function to assigh ID's when necessary
const nextId = require("../utils/nextId");

// Respond to GET request with all orders
function list(req, res) {
  res.json({ data: orders });
}

// Validate that the given property is included in a POST/PUT request (and is not an empty string)
function bodyDataHas(propertyName) {
  return function (req, res, next) {
    const { data = {} } = req.body;
    // If property is included, move to next function
    if (data[propertyName]) {
      return next();
    }

    // Respond with bad request error and correct verbiage for the given property, if missing/blank
    if (propertyName === "dishes") {
      next({ status: 400, message: `Order must include a dish` });
    }
    if (propertyName === "status") {
      next({
        status: 400,
        message: `Order must have a status of pending, preparing, out-for-delivery, delivered`,
      });
    }
    next({ status: 400, message: `Order must include a ${propertyName}` });
  };
}

// Validate that dishes property is a non-empty array and dishes have a quantity attached for POST/PUT requests
function dishesPropertyIsValid(req, res, next) {
  const { data: { dishes } = {} } = req.body;

  // If dishes property is either not an array or is an empty array, respond with bad request error
  if (!Array.isArray(dishes) || dishes.length === 0) {
    return next({
      status: 400,
      message: "Order must include at least one dish",
    });
  }

  // For each dish in the array...
  for (let i = 0; i < dishes.length; i++) {
    const quantity = dishes[i].quantity;

    // Respond with bad request error if there is no quantity, or the quantity is not an integer greater than 0
    if (!quantity || quantity <= 0 || !Number.isInteger(quantity)) {
      return next({
        status: 400,
        message: `Dish ${i} must have a quantity that is an integer greater than 0`,
      });
    }
  }
  // If dishes is an array and each dish has a quantity, move to next function
  next();
}

// Validate that status property is valid for PUT requests
function statusPropertyIsValid(req, res, next) {
  const { data: { status } = {} } = req.body;

  // Acceptable values for status
  const validStatuses = [
    "pending",
    "preparing",
    "out-for-delivery",
    "delivered",
  ];
  const currentStatus = res.locals.order.status;

  // Return bad request error if current order status is delivered, as delivered orders cannot be changed
  if (currentStatus === "delivered") {
    return next({
      status: 400,
      message: "A delivered order cannot be changed",
    });
  }

  // If status change is one of the four acceptable values, move to next function
  if (validStatuses.includes(status)) {
    return next();
  }

  // If status change is anything else, return bad request error
  next({
    status: 400,
    message:
      "Order must have a status of pending, preparing, out-for-delivery, delivered",
  });
}

// POST a new order
function create(req, res) {
  const { data: { deliverTo, mobileNumber, status, dishes } = {} } = req.body;
  // Build the new order from request data and append a random ID with the nextID function
  const newOrder = {
    id: nextId(),
    deliverTo,
    mobileNumber,
    status,
    dishes,
  };

  // Add the new order to the data in memory and respond to the request with the new order
  orders.push(newOrder);
  res.status(201).json({ data: newOrder });
}

// Validate that the order specified in url parameters exists for GET/PUT requests
function orderExists(req, res, next) {
  const orderId = req.params.orderId;
  const foundOrder = orders.find((order) => order.id === orderId);

  // If order exists, add it to res.locals.order variable and move to next function
  if (foundOrder) {
    res.locals.order = foundOrder;
    return next();
  }

  // If order does not exist in memory, return not found error
  next({ status: 404, message: `Order id not found: ${orderId}` });
}

// Respond to GET request with the given order
function read(req, res) {
  res.json({ data: res.locals.order });
}

// Validate that the id in the order stored in the data matches that in the request
function idMatches(req, res, next) {
  const { data: { id } = {} } = req.body;
  const orderId = res.locals.order.id;

  // If id matches or is not included in the request, move to next function
  if (!id || id === orderId) return next();

  // If id does not match, return bad request error
  next({
    status: 400,
    message: `Order id does not match route id. Order: ${id}, Route: ${orderId}`,
  });
}

// Update dish on validated PUT request
function update(req, res) {
  const order = res.locals.order;
  const { data: { deliverTo, mobileNumber, status, dishes } = {} } = req.body;

  // Update all details of stored order to those in request
  order.deliverTo = deliverTo;
  order.mobileNumber = mobileNumber;
  order.status = status;
  order.dishes = dishes;

  // Respond with order data
  res.json({ data: order });
}

// Validate that status of order in delete request is "pending"
function isPending(req, res, next) {
  const status = res.locals.order.status;

  // If the existing order's status is pending, move to destroy function
  if (status === "pending") {
    return next();
  }

  // If status is any of the other 3 options, return bad request error as only pending orders can be deleted
  next({
    status: 400,
    message: "An order cannot be deleted unless it is pending",
  });
}

// Respond to validated DELETE request
function destroy(req, res) {
  const { orderId } = req.params;

  // Find the index of the order to be deleted by matching id value to that in the url parameters
  const index = orders.findIndex((order) => order.id === orderId);

  // Remove the order at that index from the data in memory using splice method
  const deletedOrders = orders.splice(index, 1);

  // Return successful no content response
  res.sendStatus(204);
}

module.exports = {
  list,
  create: [
    bodyDataHas("deliverTo"),
    bodyDataHas("mobileNumber"),
    bodyDataHas("dishes"),
    dishesPropertyIsValid,
    create,
  ],
  read: [orderExists, read],
  update: [
    orderExists,
    bodyDataHas("deliverTo"),
    bodyDataHas("mobileNumber"),
    bodyDataHas("dishes"),
    bodyDataHas("status"),
    dishesPropertyIsValid,
    idMatches,
    statusPropertyIsValid,
    update,
  ],
  delete: [orderExists, isPending, destroy],
};
