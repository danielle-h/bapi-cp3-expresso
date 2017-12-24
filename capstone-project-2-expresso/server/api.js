//router for api calls
const express = require('express');
const apiRouter = express.Router();
//http status statusCodes
const statusCodes = require('./statusCodes');

//set routers for all paths
const employeeRouter = require('./employees.js');
apiRouter.use('/employees',employeeRouter);

const menuRouter = require('./menus.js');
apiRouter.use('/menus',menuRouter);

//error middleware - simply log the error and send error status. not really necessary as
//this is the default error handler, but useful in case I want specific debug statements.
apiRouter.use(function (err, req, res, next) {
  console.log(err);
  res.status(statusCodes.ERROR).send();
})

//export
module.exports = apiRouter;
