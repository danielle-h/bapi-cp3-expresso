//router for timesheet
const express = require('express');
const timesheetRouter = express.Router({mergeParams:true});
//database
const sqlite3 = require('sqlite3');
const db = new sqlite3.Database(process.env.TEST_DATABASE || './database.sqlite');
//http status codes
const statusCodes = require('./statusCodes');

//get all timesheet of this employee
timesheetRouter.get('/', (req, res, next) => {
  db.all('SELECT * FROM Timesheet WHERE employee_id = $eid',
  {$eid:req.employeeId},
  (err, rows) => {
    if (err) {
      next(err);
    } else {
      res.status(statusCodes.OK).send({timesheets: rows});
    }
  });
});

//validate timesheetId parameter
timesheetRouter.param('timesheetId', (req, res, next, id) => {
  const timesheetId = id;
  const currTimesheet = {};
  if (timesheetId && !isNaN(parseFloat(timesheetId)) && isFinite(timesheetId)) {
    db.get(`SELECT * FROM Timesheet WHERE id = $id`,{$id:id}, (err, row) => {
      if (err){
        next(err);
      }
      if (!row) {
        res.status(statusCodes.NOT_FOUND).send();
        return;
      }
      req.currTimesheet = row;
      req.timesheetId = id;
      next();
    });
  }
  else {
    res.status(statusCodes.NOT_FOUND).send();
  }
});

//middleware to validate the Timesheet body
const validateTimesheet = (req, res, next) => {
  const newTimesheet = req.body.timesheet;
  if (!newTimesheet.hours || !newTimesheet.rate || !newTimesheet.date   ) {
    return res.sendStatus(statusCodes.BAD_REQUEST);
  }
  next();
}

//create new Timesheet
timesheetRouter.post('/', validateTimesheet, (req, res, next) => {
  const newTimesheet = req.body.timesheet;
  db.run(`INSERT INTO Timesheet (hours, rate, date,  employee_id)
  VALUES ($hours, $rate,$date,$employeeId)`,
  {
    $hours: newTimesheet.hours,
    $rate: newTimesheet.rate,
    $date:newTimesheet.date,
    $employeeId:req.employeeId,
  }, function(err) {
    if (err) {
      next(err);
    }
    db.get(`SELECT * FROM Timesheet WHERE id = ${this.lastID}`, (err, row) => {
      if (!row) {
        return res.sendStatus(statusCodes.ERROR);
      }
      res.status(statusCodes.CREATED).send({timesheet: row});
    });
  });
});

//update timesheet
timesheetRouter.put('/:timesheetId', validateTimesheet,(req,res,next) => {
  const currTimesheet = req.currTimesheet;
  const toUpdate = req.body.timesheet;
  //update to Database. check errors. if not error, send updated timesheet
  db.run(`UPDATE Timesheet
    SET hours=$hours,
    rate = $rate,
    date = $date,
    employee_id = $employeeId
    WHERE id = $id`,
    {
      $id:req.timesheetId,
      $hours:toUpdate.hours,
      $rate:toUpdate.rate,
      $date:toUpdate.date,
      $employeeId:req.employeeId
    },
    (err) => {
      if (err){
        next(err);
        return;
      }
      //need to read updated timesheet from db and send that
      db.get(`SELECT * FROM Timesheet WHERE id = $id`, {$id:req.timesheetId},(err, row) => {
        if (!row) {
          return res.sendStatus(statusCodes.ERROR);
        }
        res.status(statusCodes.OK).send({timesheet:row});
      });

    });
  });

//delete timesheet
timesheetRouter.delete('/:timesheetId',(req,res,next) =>{
  db.run(`DELETE FROM Timesheet
    WHERE id = $id`,
    {
      $id:req.timesheetId
    },
    (err) => {
      if (err){
        next(err);
      }
      res.status(statusCodes.NO_CONTENT).send();
    });

  });

  //export
  module.exports = timesheetRouter;
