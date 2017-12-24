//Router for employees

const express = require('express');
const employeeRouter = express.Router();
//database
const sqlite3 = require('sqlite3');
const db = new sqlite3.Database(process.env.TEST_DATABASE || './database.sqlite');
//HTTP status codes
const statusCodes = require('./statusCodes');

//router to use for timesheets
const timesheetsRouter = require('./timesheets.js');
employeeRouter.use('/:employeeId/timesheets',timesheetsRouter);

//get all employees
employeeRouter.get('/',(req,res,next) => {
  db.all('SELECT * FROM Employee WHERE is_current_employee=1', (err, rows) => {
    if (err) {
      next(err);
    } else {
      res.status(statusCodes.OK).send({employees: rows});
    }
  });
});

//middleware to validate the employee body
const validateEmployee = (req, res, next) => {
  const newEmployee = req.body.employee;
  if (!newEmployee.name || !newEmployee.position || !newEmployee.wage ) {
    return res.sendStatus(statusCodes.BAD_REQUEST);
  }
  if (!newEmployee.isCurrentEmployee) {
    req.body.employee.isCurrentEmployee=1;
  }
  next();
}

//create new employee
employeeRouter.post('/', validateEmployee, (req, res, next) => {
  const newEmployee = req.body.employee;
  db.run(`INSERT INTO Employee (name, position, wage, is_current_employee)
  VALUES ($name, $position, $wage, $is_current_employee)`,
  {
    $name: newEmployee.name,
    $position: newEmployee.position,
    $wage: newEmployee.wage,
    $is_current_employee: newEmployee.isCurrentEmployee,
    }, function(err) {
    if (err) {
      next(err);
    }
    db.get(`SELECT * FROM Employee WHERE id = ${this.lastID}`, (err, row) => {
      if (!row) {
        return res.sendStatus(statusCodes.ERROR);
      }
      res.status(statusCodes.CREATED).send({employee: row});
    });
  });
});

//check employeeId parameter
employeeRouter.param('employeeId', (req, res, next, id) => {
  const employeeId = id;
  const currEmployee = {};
  if (employeeId && !isNaN(parseFloat(employeeId)) && isFinite(employeeId)) {
    db.get(`SELECT * FROM Employee WHERE id = $id`,{$id:id}, (err, row) => {
      if (err){
        next(err)
      }
      if (!row) {
        res.status(statusCodes.NOT_FOUND).send();
        return;
      }
      req.currEmployee = row;
      req.employeeId = id;
      next();
    });
  }
else {
  res.status(statusCodes.NOT_FOUND).send();
}
});

//get specific employee by id
employeeRouter.get('/:employeeId',(req, res, next) => {
  res.status(statusCodes.OK).send({employee:req.currEmployee});
});

//update employee
employeeRouter.put('/:employeeId',validateEmployee,(req, res, next) => {
  const currEmployee = req.currEmployee;
  const toUpdate = req.body.employee;
  //update to Database. check errors. if not error, send updated employee
  db.run(`UPDATE Employee
    SET name=$name,
    position = $position,
    wage = $wage,
    is_current_employee = $isCurrentEmployee
    WHERE id = $id`,
    {
      $id:req.employeeId,
      $name:toUpdate.name,
      $position:toUpdate.position,
      $wage:toUpdate.wage,
      $isCurrentEmployee:toUpdate.isCurrentEmployee
    },
    (err) => {
    if (err){
      next(err);
    }
    //need to read updated employee from db and send that
    db.get(`SELECT * FROM Employee WHERE id = $id`, {$id:req.employeeId},(err, row) => {
      if (!row) {
        return res.sendStatus(statusCodes.ERROR);
      }
      res.status(statusCodes.OK).send({employee:row});
    });

  });

});

//delete employee - set not currently employed
employeeRouter.delete('/:employeeId',(req,res,next) =>{
  db.run(`UPDATE Employee
    SET is_current_employee = 0
    WHERE id = $id`,
    {
      $id:req.employeeId,
    },
    (err) => {
    if (err){
      next(err);
    }
    //need to read updated employee from db and send that
    db.get(`SELECT * FROM Employee WHERE id = $id`, {$id:req.employeeId},(err, row) => {
      if (!row) {
        return res.sendStatus(statusCodes.ERROR);
      }
      res.status(statusCodes.OK).send({employee:row});
    });

  });
});

//export
module.exports = employeeRouter;
