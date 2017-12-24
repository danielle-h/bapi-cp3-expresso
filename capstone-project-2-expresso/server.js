//router for all calls
const express = require('express');
const app = express();
//body parsing middleware
const bodyParser = require('body-parser');
app.use(bodyParser.json());

//http calls logging middleware
const morgan = require('morgan');
app.use(morgan('dev'));

//cors middleware
const cors = require('cors');
app.use(cors());

//port
const PORT = process.env.PORT || 4000;

//code that was before?
app.use(express.static('public'));

//router for api calls
const apiRouter = require('./server/api');
app.use('/api',apiRouter);

//listen at port
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});

//export
module.exports = app;
