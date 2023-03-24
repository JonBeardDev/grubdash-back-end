const path = require("path");

// Use the existing dishes data
const dishes = require(path.resolve("src/data/dishes-data"));

// Use this function to assign ID's when necessary
const nextId = require("../utils/nextId");

// Respond to GET request with all dishes
function list(req, res) {
  res.json({ data: dishes });
}

// Validate that the given property is included in a POST/PUT request (and is not an empty string)
function bodyDataHas(propertyName) {
  return function (req, res, next) {
    const { data = {} } = req.body;
    // If property is included, move to next function
    if (data[propertyName]) {
      next();
    }

    // If property is not included, return bad request error
    next({ status: 400, message: `Dish must include a ${propertyName}` });
  };
}

// Validate that the price property in a POST/PUT request is an integer greater than 0
function pricePropertyIsValid(req, res, next) {
  const { data: { price } = {} } = req.body;
  if (price <= 0 || !Number.isInteger(price)) {
    // If price is 0, negative, or not an integer, return bad request error
    return next({
      status: 400,
      message: "Dish must include a price that is an integer greater than 0",
    });
  }
  next();
}

// POST a new dish
function create(req, res) {
  const { data: { name, description, price, image_url } = {} } = req.body;
  // Build the new dish from request data and append a random ID with the nextID function
  const newDish = {
    id: nextId(),
    name,
    description,
    price,
    image_url,
  };

  // Add the new dish to the data in memory and respond to the request with the new dish
  dishes.push(newDish);
  res.status(201).json({ data: newDish });
}

// Validate that the dish specified in url parameters exists for GET/PUT requests
function dishExists(req, res, next) {
  const dishId = req.params.dishId;
  const foundDish = dishes.find((dish) => dish.id === dishId);

  // If dish exists, add it to res.locals.dish variable and move to next function
  if (foundDish) {
    res.locals.dish = foundDish;
    return next();
  }

  // If dish does not exist in memory, return not found error
  next({ status: 404, message: `Dish does not exist: ${dishId}` });
}

// Respond to GET request with the given dish
function read(req, res) {
  res.json({ data: res.locals.dish });
}

// Validate that the id in the dish stored in the data matches that in the request
function idMatches(req, res, next) {
  const { data: { id } = {} } = req.body;
  const dishId = res.locals.dish.id;

  // If id matches or is not included in the request, move to next function
  if (!id || id === dishId) {
    return next();
  }

  // If id does not match, return bad request error
  next({
    status: 400,
    message: `Dish id does not match route id. Dish: ${id}, Route: ${dishId}`,
  });
}

// Update dish on validated PUT request
function update(req, res) {
  const dish = res.locals.dish;
  const { data: { name, description, price, image_url } = {} } = req.body;

  // Update all details of stored dish to those in request
  dish.name = name;
  dish.description = description;
  dish.price = price;
  dish.image_url = image_url;

  // Respond with dish data
  res.json({ data: dish });
}

module.exports = {
  list,
  create: [
    bodyDataHas("name"),
    bodyDataHas("description"),
    bodyDataHas("price"),
    bodyDataHas("image_url"),
    pricePropertyIsValid,
    create,
  ],
  read: [dishExists, read],
  update: [
    dishExists,
    bodyDataHas("name"),
    bodyDataHas("description"),
    bodyDataHas("price"),
    bodyDataHas("image_url"),
    pricePropertyIsValid,
    idMatches,
    update,
  ],
};
