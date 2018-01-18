'use strict';

class Vector {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    plus(vector) {
        if(!(vector instanceof Vector)) {
            throw new Error('Можно прибавлять к вектору только вектор типа Vector');
        } else {
            return new Vector(this.x + vector.x, this.y + vector.y);
        }
    }

    times(multiplier) {
        return new Vector(this.x * multiplier, this.y * multiplier);
    }
}

class Actor {
    constructor(location = new Vector(0, 0), size = new Vector(1, 1), speed = new Vector(0, 0)) {
        if (!(location instanceof Vector) || !(size instanceof Vector) || !(speed instanceof Vector)) {
            throw new Error("Ошибка в данных");
          }
      
          this.size = size;
          this.pos = location;
          this.speed = speed;
          this.startPos = new Vector(this.pos.x, this.pos.y); 
        }

    get type() { 
        return 'actor'; 
    }

    get pos() {
        return this.location;
    }

    set pos(location) {
        this.location = location;
        this.left = location.x;
        this.top = location.y;
        this.right = location.x + this.size.x;
        this.bottom = location.y + this.size.y;  
    }
    
    act() {            
    }

    isIntersect(actor) {
        if (actor instanceof Actor) {
            if (this === actor) { 
                return false;
            }
            return !(actor == this || this.right <= actor.left || actor.right <= this.left || this.bottom <= actor.top || this.top >= actor.bottom);
        } else {
            throw new Error('Передан неверный объект');
        }
    }        
}


class Level {
    constructor(grid = [], actors = []) {
        this.grid = grid;
        this.actors = actors;  
        this.player = actors.find((item) => item.type == 'player');
        this.height = this.grid.length;
      
        Object.defineProperty(this, "width", {
            get: () => {
                if (this.grid.length === 0) {
                    return 0;
                } 
                let max = 0;
                for (let i = 0; i < grid.length; i++) {
                    if (this.grid[i].length > max) {
                         max = this.grid[i].length;
                    }
                }
                return max;
            }
        });
      
        this.status = null;
        this.finishDelay = 1;
    }

     
  
    isFinished() {
      return (this.status !== null && this.finishDelay < 0);
    }
  
    actorAt(actor) {
      if (!(actor instanceof Actor) || actor === undefined) { 
          throw new Error("Объект не является Actor");
      }
      if (this.actors === undefined || this.actors.length < 2) {
           return undefined;
      }
      for (let act of this.actors) { 
          if (actor.isIntersect(act)) {
               return act;
          }
        }
      return undefined;
    }

    obstacleAt(destination, sizeOfObject) {
        if (!(destination instanceof Vector) && !(sizeOfObject instanceof Vector)) {
             throw new Error("Первый и второй объект не являются Vector");
        }
        let actor = new Actor(destination, sizeOfObject);
        let level = new Actor(new Vector(), new Vector(this.width, this.height));
        if (actor.bottom > level.bottom) {
             return "lava";
        }
        if (actor.left < level.left || actor.right > level.right || actor.top < level.top) {
            return "wall";
        }
        for (let row = Math.floor(actor.top); row < Math.ceil(actor.bottom); row++) {
            for (let column = Math.floor(actor.left); column < Math.ceil(actor.right); column++) {
                if (this.grid[row][column] === undefined) {
                    continue;
                }
                if (this.grid[row][column] === "lava") {
                    return "lava";
                }
                if (this.grid[row][column] === "wall") {
                    return "wall";
                }
            }
        }
        return undefined;
    }
  
    removeActor(actor) {
      if (this.actors === undefined || actor === undefined) {
           return;
      }
      for (let i = 0; i < this.actors.length; i++)
        if (this.actors[i] === actor) {
            this.actors.splice(i, 1);
            return;
        }
    }
  
    noMoreActors(type) {
        if (this.actors.length > 0) {
            for (let i = 0; i < this.actors.length - 1; i++) {
              return this.actors[i].type != type;
            }
          } else {
            return true;
          }
    }
  
    playerTouched(type, actor) {
        if (this.status !== null) {
           return;
        }
        if (type === "lava" || type === "fireball") {
            this.status = "lost";
        }
        if (type === 'coin') {
            this.removeActor(actor);
            if (this.noMoreActors("coin")) {
                this.status = "won";
            }      
        }
    }
}

class LevelParser {
    constructor(dictionary) {
        this.dictionary = dictionary;
    }
  
    actorFromSymbol(symbol) {
        if (symbol === undefined) {
            return undefined;
        }
        return this.dictionary[symbol];
    }
  
    obstacleFromSymbol(symbol) {
        if (symbol === "x") { 
            return "wall";
        }
        else if (symbol === "!") {
            return "lava"; 
        }
    }
  
    createGrid(strings) {
        if (strings.length < 1) {
            return [];
        }
        let grid = []; 
        let row;
        for (let string of strings) {
            row = [];
            for (let char of string) {
                row.push(this.obstacleFromSymbol(char));
            }
            grid.push(row);
        }
        return grid;
    }
  
    createActors(strings) {
        let actor, actors = []; 
        for (let i = 0; i < strings.length; i++) {
            for (let j = 0; j < strings[i].length; j++) {
                try {
                    const ActorClass = this.actorFromSymbol(strings[i][j]);
                    actor = new ActorClass(new Vector(j, i));
                    if (actor instanceof Actor) {
                        actors.push(actor);
                    }
                } catch (exception) {}
            }
        }
        return actors;
    }
  
    parse(strings) {
        let grid = this.createGrid(strings);
        let actors = this.createActors(strings);
        return new Level(grid, actors);
    }
}
  

class Fireball extends Actor {
    constructor(position = new Vector(), speed = new Vector()) {
        super(position, new Vector(1, 1), speed);
        Object.defineProperty(this, "type", {configurable: true, value: "fireball", writable: false});
    }
  
    getNextPosition(time = 1) {
        return new Vector(this.pos.x + this.speed.x * time, this.pos.y + this.speed.y * time);
    }
  
    handleObstacle() {
        this.speed = new Vector(-this.speed.x, -this.speed.y);
    }
  
    act(time, level) {
        let nextPosition = this.getNextPosition(time);
        if (level.obstacleAt(nextPosition, this.size)) {
            this.handleObstacle();
        } else {
             this.pos = nextPosition;
        }
    }
}

class HorizontalFireball extends Fireball {
    constructor(position = new Vector(), speed = new Vector(2, 0)) {
        super(position, speed);
    }
}
  
class VerticalFireball extends Fireball {
    constructor(position = new Vector(), speed = new Vector(0, 2)) {
        super(position, speed);
    }
}

class FireRain extends Fireball {
    constructor(position = new Vector(), speed = new Vector(0, 3)) {
        super(position, speed);
    }
  
    handleObstacle() {
        this.pos = new Vector(this.startPos.x, this.startPos.y);
    }
}
  
class Coin extends Actor {  
    constructor(position = new Vector()) {
        super(new Vector(position.x + 0.2, position.y + 0.1), new Vector(0.6, 0.6));
        Object.defineProperty(this, "type", {configurable: true, value: "coin", writable: false});
        Object.defineProperty(this, "type", {configurable: true, get : () => "coin" });
        this.springSpeed = 8;
        this.springDist = 0.07;
        this.spring = 2 * Math.PI * Math.random();
    }
  
    updateSpring(time = 1) {
        this.spring += this.springSpeed * time;
    }
  
    getSpringVector() {
        return new Vector(0, Math.sin(this.spring) * this.springDist);
    }
  
    getNextPosition(time) {
        this.updateSpring(time);
        return this.pos.plus(this.getSpringVector());
    }
  
    act(time) {
        this.pos = this.getNextPosition(time);
    }
  }
  
class Player extends Actor {
    constructor(position = new Vector()) {
        super(new Vector(position.x, position.y - 0.5), new Vector(0.8, 1.5));
        Object.defineProperty(this, "type", {configurable: true, value: "player", writable: false});
    }
}
  
let levels = [
    [
        '         ',
        '         ',
        '    =    ',
        '       o ',
        '     !xxx',
        ' @       ',
        'xxx!     ',
        '         '
      ],
      [
        '      v  ',
        '    v    ',
        '  v      ',
        '        o',
        '        x',
        '@   x    ',
        'x        ',
        '         '
    ]
];
const actorDict = {
  '@': Player,
  '=': HorizontalFireball,
  'v': FireRain,
  '|': VerticalFireball,
  'o': Coin
};
const parser = new LevelParser(actorDict);
runGame(levels, parser, DOMDisplay)
  .then(() => alert('Вы выиграли приз!'));