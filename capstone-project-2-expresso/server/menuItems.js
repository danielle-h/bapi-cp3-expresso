//router for menuItems
const express = require('express');
const menuItemsRouter = express.Router({mergeParams:true});
//database
const sqlite3 = require('sqlite3');
const db = new sqlite3.Database(process.env.TEST_DATABASE || './database.sqlite');
//http status codes
const statusCodes = require('./statusCodes');

//get all items of this menu
menuItemsRouter.get('/', (req, res, next) => {
  db.all('SELECT * FROM MenuItem WHERE menu_id = $mid',
  {$mid:req.menuId},
  (err, rows) => {
    if (err) {
      next(err);
    } else {
      res.status(statusCodes.OK).send({menuItems: rows});
    }
  });
});

//validate menuItemId parameter
menuItemsRouter.param('menuItemId', (req, res, next, id) => {
  const menuItemId = id;
  const currMenuItem = {};
  if (menuItemId && !isNaN(parseFloat(menuItemId)) && isFinite(menuItemId)) {
    db.get(`SELECT * FROM MenuItem WHERE id = $id`,{$id:id}, (err, row) => {
      if (err){
        next(err);
      }
      if (!row) {
        res.status(statusCodes.NOT_FOUND).send();
        return;
      }
      req.currMenuItem = row;
      req.menuItemId = id;
      next();
    });
  }
  else {
    res.status(statusCodes.NOT_FOUND).send();
  }
});

//middleware to validate the MenuItem body
const validateMenuItem = (req, res, next) => {
  const newMenuItem = req.body.menuItem;
  if (!newMenuItem.name || !newMenuItem.description || !newMenuItem.inventory || !newMenuItem.price   ) {
    return res.sendStatus(statusCodes.BAD_REQUEST);
  }
  next();
}

//create new MenuItem
menuItemsRouter.post('/', validateMenuItem, (req, res, next) => {
  const newMenuItem = req.body.menuItem;
  db.run(`INSERT INTO MenuItem (name, description, inventory, price, menu_id)
  VALUES ($name, $description,$inventory,$price,$menuId)`,
  {
    $name: newMenuItem.name,
    $description: newMenuItem.description,
    $inventory:newMenuItem.inventory,
    $price:newMenuItem.price,
    $menuId:req.menuId,
  }, function(err) {
    if (err) {
      next(err);
    }
    db.get(`SELECT * FROM MenuItem WHERE id = ${this.lastID}`, (err, row) => {
      if (!row) {
        return res.sendStatus(statusCodes.ERROR);
      }
      res.status(statusCodes.CREATED).send({menuItem: row});
    });
  });
});

//update menuItem
menuItemsRouter.put('/:menuItemId', validateMenuItem,(req,res,next) => {
  const currMenuItem = req.currMenuItem;
  const toUpdate = req.body.menuItem;
  //update to Database. check errors. if not error, send updated menuItem
  db.run(`UPDATE MenuItem
    SET name=$name,
    description = $description,
    inventory = $inventory,
    price = $price,
    menu_id = $menuId
    WHERE id = $id`,
    {
      $id:req.menuItemId,
      $name:toUpdate.name,
      $description:toUpdate.description,
      $inventory:toUpdate.inventory,
      $price:toUpdate.price,
      $menuId:req.menuId,
    },
    (err) => {
      if (err){
        next(err);
        return;
      }
      //need to read updated menuItem from db and send that
      db.get(`SELECT * FROM MenuItem WHERE id = $id`, {$id:req.menuItemId},(err, row) => {
        if (!row) {
          return res.sendStatus(statusCodes.ERROR);
        }
        res.status(statusCodes.OK).send({menuItem:row});
      });

    });
  });

//delete menuItem
menuItemsRouter.delete('/:menuItemId',(req,res,next) =>{
  db.run(`DELETE FROM MenuItem
    WHERE id = $id`,
    {
      $id:req.menuItemId
    },
    (err) => {
      if (err){
        next(err);
      }
      res.status(statusCodes.NO_CONTENT).send();
    });

  });



//export
module.exports = menuItemsRouter;
