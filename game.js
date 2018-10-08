'use strict';

class Vector {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    plus(vector) {
        if (!(vector instanceof Vector)) { 
            throw new Error('Можно прибавлять к вектору только вектор типа Vector');
        }  
         return new Vector(this.x + vector.x, this.y + vector.y);
    }

    times(multiplier = 1) {
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
    }

    get type() { 
        return 'actor'; 
    }

    get left() {
        return this.pos.x;
    }

    get top() {
        return this.pos.y;
    }

    get right() {
        return this.pos.x + this.size.x;
    }

    get bottom() {
        return this.pos.y + this.size.y;
    }
    
    act() {            
    }

    isIntersect(actor) {
        if (!(actor instanceof Actor)) {
            throw new Error('Передан неверный объект')
        }
        if (this === actor) { 
            return false;
        }
        return (this.right > actor.left && actor.right > this.left && this.bottom > actor.top && this.top < actor.bottom);
    }        
}

class Level {
    constructor(grid = [], actors = []) {
        this.grid = grid.slice();
        this.actors = actors.slice();
        this.player = actors.find((item) => item.type === 'player');
        this.height = this.grid.length;
        this.width = Math.max(...grid.map((el) => el.length), 0); 
        this.status = null;
        this.finishDelay = 1;
    }
 
    isFinished() {
        return this.status !== null && this.finishDelay < 0;
    }
  
    actorAt(actor) {
        if (!(actor instanceof Actor)) { 
            throw new Error("Объект не является Actor");
        }
        return this.actors.find(el => el.isIntersect(actor));
    }
        
    obstacleAt(destination, sizeOfObject) {
        if (!(destination instanceof Vector) && !(sizeOfObject instanceof Vector)) {
            throw new Error("Первый и второй объект не являются Vector");
        }
        const startX = Math.floor(destination.x);
        const endX = Math.ceil(destination.x + sizeOfObject.x);
        const startY = Math.floor(destination.y);
        const endY = Math.ceil(destination.y + sizeOfObject.y);
        if (endY > this.height) {
            return "lava";
        }
        if (startX < 0 || endX > this.width || startY < 0) {
            return "wall";
        }
        for (let row = startY; row < endY; row++) {
            for (let column = startX; column < endX; column++) {
                const obstacle = this.grid[row][column];
                if(obstacle) {
                    return obstacle;
                }
            }
        }
    }
  
    removeActor(actor) {
        for (let i = 0; i < this.actors.length; i++) {
            if (this.actors[i] === actor) {
                this.actors.splice(i, 1);
                return;
            }
        }
    }
  
    noMoreActors(type) {
        return !this.actors.some((el) => el.type === type);
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
    constructor(dictionary = {}) {
        this.dictionary = Object.assign({}, dictionary);
    }
  
    actorFromSymbol(symbol) {
        return this.dictionary[symbol];
    }
  
    obstacleFromSymbol(symbol) {
        if (symbol === "x") { 
            return "wall";
        } 
        if (symbol === "!") {
            return "lava"; 
        }
    }
    
    createGrid(strings = []) {
        return strings.map((row) => 
            row.split('').map((item) => 
                this.obstacleFromSymbol(item)
            )
        );
    }
  
    createActors(strings) {
        const actors = [];
        strings.forEach((row, i) => {
            row.split('').forEach((item, j) => {
                const ActorClass = this.actorFromSymbol(item);
                if (typeof ActorClass === 'function') {
                    const actor = new ActorClass(new Vector(j, i));
                    if (actor instanceof Actor){
                        actors.push(actor);
                    }
                }
            });
        });
        return actors;
    }
  
    parse(strings) {
        const grid = this.createGrid(strings);
        const actors = this.createActors(strings);
        return new Level(grid, actors);
    }
}
  
class Fireball extends Actor {
    constructor(position = new Vector(0, 0), speed = new Vector(0, 0)) {
        super(position, new Vector(1, 1), speed);
    }

    get type() {
        return 'fireball';
    }
  
    getNextPosition(time = 1) {
        return this.pos.plus(this.speed.times(time));
    }
  
    handleObstacle() {
        this.speed = this.speed.times(-1);
    }
  
    act(time, level) {
        const nextPosition = this.getNextPosition(time);
        if (level.obstacleAt(nextPosition, this.size)) {
            this.handleObstacle();
        } else {
            this.pos = nextPosition;
        }
    }
}

class HorizontalFireball extends Fireball {
    constructor(position = new Vector(0, 0)) {
        super(position, new Vector(2, 0));
    }
}
  
class VerticalFireball extends Fireball {
    constructor(position = new Vector(0, 0)) {
        super(position, new Vector(0, 2));
    }
}

class FireRain extends Fireball {
    constructor(position = new Vector(0, 0)) {
        super(position, new Vector(0, 3));
        this.startPos = position; 
    }
  
    handleObstacle() {
        this.pos = this.startPos;
    }
}
  
class Coin extends Actor {  
    constructor(position = new Vector(0, 0)) {
        super(position.plus(new Vector(0.2, 0.1)), new Vector(0.6, 0.6));
        this.initPos = this.pos;
        this.springSpeed = 8;
        this.springDist = 0.07;
        this.spring = Math.random() * Math.PI * 2;
    }

    get type() {
        return 'coin';
    }

    updateSpring(time = 1) {
        this.spring += this.springSpeed * time;
    }

    getSpringVector() {
        return new Vector(0, Math.sin(this.spring) * this.springDist);
    }

    getNextPosition(time = 1) {
        this.updateSpring(time);
        return this.initPos.plus(this.getSpringVector());
    }

    act(time) {
        this.pos = this.getNextPosition(time);
    }
}
  
class Player extends Actor {
    constructor(position = new Vector(0, 0)) {
        super(position.plus(new Vector(0, -0.5)), new Vector(0.8, 1.5));
    }

    get type() {
        return 'player';
    }
}

const actorDict = {
    '@': Player,
    '=': HorizontalFireball,
    'v': FireRain,
    '|': VerticalFireball,
    'o': Coin
};

const parser = new LevelParser(actorDict);
loadLevels()
    .then((levels) => JSON.parse(levels))
    .then((scheme) => runGame(scheme, parser, DOMDisplay))
    .then(() => alert('Вы выиграли приз!'))