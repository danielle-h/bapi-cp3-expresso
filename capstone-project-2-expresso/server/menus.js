//Router for employees

const express = require('express');
const menuRouter = express.Router();
//database
const sqlite3 = require('sqlite3');
const db = new sqlite3.Database(process.env.TEST_DATABASE || './database.sqlite');
//HTTP status codes
const statusCodes = require('./statusCodes');

//router to use for menuItems
const menuItemsRouter = require('./menuItems.js');
menuRouter.use('/:menuId/menu-items',menuItemsRouter);

//get all menus
menuRouter.get('/',(req,res,next) => {
  db.all('SELECT * FROM Menu', (err, rows) => {
    if (err) {
      next(err);
    } else {
      res.status(statusCodes.OK).send({menus: rows});
    }
  });
});

//middleware to validate the Menu body
const validateMenu = (req, res, next) => {
  const newMenu = req.body.menu;
  if (!newMenu.title ) {
    return res.sendStatus(statusCodes.BAD_REQUEST);
  }
  next();
}

//create new Menu
menuRouter.post('/', validateMenu, (req, res, next) => {
  const newMenu = req.body.menu;
  db.run(`INSERT INTO Menu (title)
  VALUES ($title)`,
  {
    $title: newMenu.title,
  }, function(err) {
    if (err) {
      next(err);
    }
    db.get(`SELECT * FROM Menu WHERE id = ${this.lastID}`, (err, row) => {
      if (!row) {
        return res.sendStatus(statusCodes.ERROR);
      }
      res.status(statusCodes.CREATED).send({menu: row});
    });
  });
});

//check menuId parameter
menuRouter.param('menuId',(req, res, next, id) => {
  const menuId = id;
  const currMenu = {};
  if (menuId && !isNaN(parseFloat(menuId)) && isFinite(menuId)) {
    db.get(`SELECT * FROM Menu WHERE id = $id`,{$id:id}, (err, row) => {
      if (err){
        res.status(statusCodes.ERROR).send();
        return;
      }
      if (!row) {
        res.status(statusCodes.NOT_FOUND).send();
        return;
      }
      req.currMenu = row;
      req.menuId = id;
      next();
    });
  }
  else {
    res.status(statusCodes.NOT_FOUND).send();
  }
});

//get specific menu by id
menuRouter.get('/:menuId',(req, res, next) => {
  res.status(statusCodes.OK).send({menu:req.currMenu});
});

//update menu
menuRouter.put('/:menuId',validateMenu,(req, res, next) => {
  const currMenu = req.currMenu;
  const toUpdate = req.body.menu;
  //update to Database. check errors. if not error, send updated menu
  db.run(`UPDATE Menu
    SET title=$title
    WHERE id = $id`,
    {
      $id:req.menuId,
      $title:toUpdate.title
    },
    (err) => {
      if (err){
        next(err);
      }
      //need to read updated menu from db and send that
      db.get(`SELECT * FROM Menu WHERE id = $id`, {$id:req.menuId},(err, row) => {
        if (!row) {
          return res.sendStatus(statusCodes.ERROR);
        }
        res.status(statusCodes.OK).send({menu:row});
      });

    });

  });

  //delete menu
  menuRouter.delete('/:menuId',(req,res,next) =>{
    db.get(`SELECT COUNT(*) as num FROM MenuItem
    WHERE menu_id = $mid`,
    {$mid:req.menuId}, (err,row) => {
      if (err) {
        next(err);
      }
      if (row.num!=0){
        res.status(statusCodes.BAD_REQUEST).send();
        return;
      }
      //number of menuItems==0, so we can delete
      db.run(`DELETE FROM Menu
        WHERE id = $id`,
        {
          $id:req.menuId
        },
        (err) => {
          if (err){
            next(err);
          }
          res.status(statusCodes.NO_CONTENT).send();
        });
      });

    });



//export
module.exports = menuRouter;
