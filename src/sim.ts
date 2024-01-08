import { Item, ItemCondition, ItemConditionTypes, ItemConditions, ItemState, REGISTRY, Recipe } from "./lib";

export const WORLD_SIZE = 40;
export const CHUNK_SIZE = 10;

type PositionedItem = { x: number, y: number, item: ItemState | null };

export class Chunk {
    x: number;
    y: number;
    items: Array<ItemState | null>;

    constructor(x: number, y: number, items: Array<ItemState | null>) {
        this.x = x;
        this.y = y;
        this.items = items;
    }

    get(x: number, y: number) {
        return this.items[y * CHUNK_SIZE + x] || null;
    }

    set(x: number, y: number, item: ItemState | null) {
        this.items[y * CHUNK_SIZE + x] = item;
    }

    has(selector: ItemConditions) {
        return this.items.some(item => item != null && ItemConditions.matches(selector, item.item));
    }

    find(selector: ItemConditions): PositionedItem | null {
        const index = this.items.findIndex(item => item != null && ItemConditions.matches(selector, item.item));
        if (index === -1) {
            return null;
        }
        return { x: this.x * CHUNK_SIZE + index % CHUNK_SIZE, y: this.y + Math.floor(index / CHUNK_SIZE), item: this.items[index] };
    }
    
    get active() {
        return this.items.some(item => item != null && item.item.active);
    }

    get heatProduced() {
        return this.items.reduce((a, b) => a + (b?.item.properties.heat || 0), 0);
    }
}

export class World {
    chunks: Chunk[] = [];
    heat: number[] = [];

    constructor() {
        for (let y = 0; y < WORLD_SIZE; y += 1) {
            for (let x = 0; x < WORLD_SIZE; x += 1) {
                this.chunks.push(new Chunk(x, y, new Array(CHUNK_SIZE * CHUNK_SIZE).fill(null)));
                this.heat.push(0);
            }
        }
    }

    update(temp: number) {
        for (let y = 0; y < WORLD_SIZE; y += 1) {
            for (let x = 0; x < WORLD_SIZE; x += 1) {
                const index = y * WORLD_SIZE + x;
                this.heat[index] = mlerp(this.heat[index], temp + this.chunks[index].heatProduced, 0.05);
            }
        }
        // disperse
        for (let y = 0; y < WORLD_SIZE; y += 1) {
            for (let x = 0; x < WORLD_SIZE; x += 1) {
                const index = y * WORLD_SIZE + x;
                const temp = this.heat[index];

                const left = (x > 0) ? this.heat[index - 1] : temp;
                const right = (x < WORLD_SIZE - 1) ? this.heat[index + 1] : temp;
                const up = (y > 0) ? this.heat[index - WORLD_SIZE] : temp;
                const down = (y < WORLD_SIZE - 1) ? this.heat[index + WORLD_SIZE] : temp;

                const avg = (left + right + up + down) / 4;
                if (avg > temp) {
                    this.heat[index] = mlerp(temp, avg, 0.2);
                } else {
                    this.heat[index] = mlerp(temp, avg, 0.01);
                }
                
            }
        }
    }

    get size() {
        return WORLD_SIZE * CHUNK_SIZE;
    }

    getChunk(x: number, y: number) {
        return this.chunks[y * WORLD_SIZE + x];
    }

    active() {
        return this.chunks.filter(chunk => chunk.active).map(chunk => {
            const res: PositionedItem[] = [];
            let index = chunk.items.findIndex(item => item != null && item.item.active);
            while (index !== -1) {
                res.push({ x: chunk.x * CHUNK_SIZE + index % CHUNK_SIZE, y: chunk.y * CHUNK_SIZE + Math.floor(index / CHUNK_SIZE), item: chunk.items[index] });
                index = chunk.items.findIndex((item, i) => i > index && item != null && item.item.active);
            }
            return res;
        }).flat();
    }

    get(x: number, y: number) {
        return this.getChunk(Math.floor(x / CHUNK_SIZE), Math.floor(y / CHUNK_SIZE))?.get(x % CHUNK_SIZE, y % CHUNK_SIZE) || null;
    }

    set(x: number, y: number, item: ItemState | null) {
        this.getChunk(Math.floor(x / CHUNK_SIZE), Math.floor(y / CHUNK_SIZE)).set(x % CHUNK_SIZE, y % CHUNK_SIZE, item);
    }

    localWorld(x: number, y: number, size: number): PositionedItem[] {
        const local: ({x: number, y: number, item: ItemState | null})[] = [];
        for (let dy = -size; dy <= size; dy += 1) {
            for (let dx = -size; dx <= size; dx += 1) {
                const xx = x + dx;
                const yy = y + dy;
                if (xx < 0 || yy < 0 || xx >= this.size || yy >= this.size) {
                    local.push({x: xx, y: yy, item: null});
                } else {
                    local.push({x: xx, y: yy, item: this.get(xx, yy)});
                }
            }
        }
        return local;
    }


}

export function generateName() {
    const vowels = 'eaiou';
    const consonants = 'tnsrhldcymfwgpbvkxjqz';
    const syllables = Math.round(Math.random() * 3 + 1);
    let name = '';
    for (let i = 0; i < syllables; i += 1) {
        name += consonants[Math.floor(Math.random() ** 2 * consonants.length)];
        name += vowels[Math.floor(Math.random() * vowels.length)];
        if (Math.random() < 0.5) {
            name += consonants[Math.floor(Math.random() ** 2 * consonants.length)];
        }
    }
    return name;
}

export function generateId() {
    return Math.random().toString(36).substring(2, 9);
}

export function hashString(str: string) {
    let hash = 0;
    for (let i = 0; i < str.length; i += 1) {
        hash += str.charCodeAt(i);
        hash += (hash << 10);
        hash ^= (hash >> 6);
        hash += (hash << 3);
    }
    return hash;
}

export function mlerp(a: number, b: number, t: number) {
    return a + (b - a) * t;
}

export function sigmoid(x: number) {
    return 1 / (1 + Math.exp(-x));
}

export function normal(x: number) {
    return Math.exp(-(x ** 2));
}

enum Needs {
    Health = 'health',
    Hunger = 'hunger',
    Temperature = 'temperature',
    Boredom = 'boredom',
}

enum Direction {
    Here = 0,
    Up = 1,
    Left = 2,
    Down = 3,
    Right = 4,
}

enum ActionType {
    Nothing = 'nothing',
    Move = 'move',
    Interact = 'interact',
    Eat = 'eat',
}

interface Action {
    type: ActionType;
    data: any;
}

interface ActionNothing extends Action {
    type: ActionType.Nothing;
    data: {};
}

interface ActionMove extends Action {
    type: ActionType.Move;
    data: {
        direction: Direction;
    };
}

interface ActionInteract extends Action {
    type: ActionType.Interact;
    data: {
        direction: Direction;
    };
}

interface ActionEat extends Action {
    type: ActionType.Eat;
    data: {};
}

const Action = {
    Nothing: (): ActionNothing => ({
        type: ActionType.Nothing,
        data: {},
    }),
    Move: (direction: Direction): ActionMove => ({
        type: ActionType.Move,
        data: { direction },
    }),
    Interact: (direction: Direction): ActionInteract => ({
        type: ActionType.Interact,
        data: { direction },
    }),
    Eat: (): ActionEat => ({
        type: ActionType.Eat,
        data: {},
    }),
};

enum NounType {
    Person = 'person',
    Place = 'place',
    Thing = 'thing',
}

interface Noun {
    type: NounType;
    data: any;
}

interface NounPerson extends Noun {
    type: NounType.Person;
    data: {
        id: string;
    };
}

interface NounPlace extends Noun {
    type: NounType.Place;
    data: {
        x: number;
        y: number;
    };
}

interface NounThing extends Noun {
    type: NounType.Thing;
    data: {
        selector: ItemConditions;
    };
}

const Noun = {
    Person: (id: string): NounPerson => ({
        type: NounType.Person,
        data: { id },
    }),
    Place: (x: number, y: number): NounPlace => ({
        type: NounType.Place,
        data: { x, y },
    }),
    Thing: (selector: ItemConditions): NounThing => ({
        type: NounType.Thing,
        data: { selector },
    }),
}

enum MemoryType {
    Location = 'location',
    PersonKnows = 'personKnows',
    Exists = 'exists',
}

interface Memory {
    type: MemoryType;
    data: any;
    time: number;
}

interface MemoryLocation extends Memory {
    type: MemoryType.Location;
    data: {
        noun: Noun;
        x: number;
        y: number;
    };
}

interface MemoryPersonKnows extends Memory {
    type: MemoryType.PersonKnows;
    data: {
        person: NounPerson;
        memory: Memory;
    };
}

interface MemoryExists extends Memory {
    type: MemoryType.Exists;
    data: {
        noun: Noun;
    };
}

const Memory = {
    Location: (noun: Noun, x: number, y: number, time: number): MemoryLocation => ({
        type: MemoryType.Location,
        data: { noun, x, y},
        time,
    }),
    PersonKnows: (person: NounPerson, memory: Memory, time: number): MemoryPersonKnows => ({
        type: MemoryType.PersonKnows,
        data: { person, memory },
        time,
    }),
    Exists: (noun: Noun, time: number): MemoryExists => ({
        type: MemoryType.Exists,
        data: { noun },
        time,
    }),
}

enum ObjectiveType {
    FulfillNeed = 'fulfillNeed',
    Obtain = 'obtain',
    BoredomTask = 'boredomTask',
}

interface Objective {
    type: ObjectiveType;
    data: any;
}

interface ObjectiveFulfillNeed extends Objective {
    type: ObjectiveType.FulfillNeed;
    data: {
        need: Needs;
    };
}

interface ObjectiveObtain extends Objective {
    type: ObjectiveType.Obtain;
    data: {
        noun: NounThing;
        another: boolean;
        children: number[];
    };
}

enum BoredomTaskType {
    Craft = 'craft',
    Organize = 'organize',
    Farm = 'farm',
    Build = 'build',
}

interface ObjectiveBoredomTask extends Objective {
    type: ObjectiveType.BoredomTask;
    data: {
        task: BoredomTaskType;
        expiry: number;
    };
}

const Objective = {
    FulfillNeed: (need: Needs): ObjectiveFulfillNeed => ({
        type: ObjectiveType.FulfillNeed,
        data: { need },
    }),
    Obtain: (noun: NounThing, another: boolean = false): ObjectiveObtain => ({
        type: ObjectiveType.Obtain,
        data: { noun, another, children: [] },
    }),
    BoredomTask: (task: BoredomTaskType, expiry: number): ObjectiveBoredomTask => ({
        type: ObjectiveType.BoredomTask,
        data: { task, expiry },
    }),
}

export default class Person {
    id: string;
    name: string;
    surname: string;
    born: number;
    x: number;
    y: number;
    gender: number;

    home: { x: number, y: number } | null = null;

    health: number = 100;
    hunger: number = 100;
    temperature: number = 0;
    score: number = 0;

    reputations: { [id: string]: number } = {};
    needs: { [id in Needs]: number } = {
        [Needs.Health]: 0,
        [Needs.Hunger]: 0,
        [Needs.Temperature]: 0,
        [Needs.Boredom]: 0,
    };

    memory: Memory[] = [];
    objectives: Objective[] = [];

    long: { [key: string]: any } = {};
    short: { [key: string]: any } = {};

    common: { [key: number]: number } = {};

    holding: ItemState | null = null;

    nextAction: Action | null = null;
    
    constructor(id: string, name: string, surname: string, born: number, x: number, y: number) {
        this.id = id;
        this.name = name;
        this.surname = surname;
        this.born = born;
        this.x = x;
        this.y = y;
        this.gender = Math.random();
    }

    male() {
        return this.gender < 0.5;
    }

    female() {
        return this.gender > 0.5;
    }

    get fullName() {
        return `${this.name} ${this.surname}`;
    }

    get color() {
        return Math.abs(hashString(this.surname)) % 64;
    }

    get altColor() {
        return Math.abs(hashString(this.name)) % 64;
    }

    get display() {
        const myDisplay = [{ character: this.male() ? 11 : 12, color: this.color }];
        const holdingDisplay = this.holding?.item.display ?? [];
        return [...myDisplay, ...holdingDisplay];
    }

    get known() {
        return this.memory.filter(memory => 
            memory.type === MemoryType.Location 
            && memory.data.noun.type === NounType.Thing)
            .map(memory => REGISTRY.query(memory.data.noun.data.selector))
            .flat()
            .filter((item, index, self) => self.indexOf(item) === index);
    }

    hungerSeverity() {
        return this.hunger < 20 ? 1 : sigmoid((50 - this.hunger) / 10)
    }

    update(world: World) {
        
        const temp = world.heat[this.outerIndex()];
        this.temperature = mlerp(this.temperature, temp, 0.02);

        this.score += (this.temperature / 20) ** 3;
        
        if (this.health < 100) {
            this.score -= ((100 - this.health) / 100) ** 2;
            this.health += sigmoid((this.hunger - 50) / 10) * 0.01;
        }

        const tempEffect = 1 - sigmoid(this.temperature / 2);
        this.hunger -= 0.03 * (0.1 + tempEffect * 0.9);
        if (this.hunger < 0) {
            this.health -= 1.0 * tempEffect * tempEffect;
            this.hunger = 0;
        }
        if (this.hunger > 100) {
            this.health += (this.hunger - 100);
            this.hunger = 100;
        }
        if (this.health > 100) {
            this.score += (this.health - 100) ** 2;
            this.health = 100;
        }

        if (this.score < 0) {
            this.score = 0;
        }
    }

    think(world: World, people: Person[], now: number) {
        // compute needs
        this.needs[Needs.Health] = (80 - Math.min(this.health, 80)) ** 3;
        this.needs[Needs.Hunger] = (90 - Math.min(this.hunger, 90)) ** 2;
        this.needs[Needs.Temperature] = (Math.max((5 - this.temperature) * 10, 0));
        this.needs[Needs.Boredom] = (this.health > 80 && this.hunger > 80) ? 60 : 0;

        const local = world.localWorld(this.x, this.y, 10);
        const localPeople = people.filter(person => Math.abs(person.x - this.x) < 10 && Math.abs(person.y - this.y) < 10);
        const indices = [
            { x: this.x, y: this.y },
            { x: this.x, y: this.y - 1 },
            { x: this.x - 1, y: this.y },
            { x: this.x, y: this.y + 1 },
            { x: this.x + 1, y: this.y },
        ];

        // forget memories after a day
        this.memory = this.memory.filter(memory => now - memory.time < 86400);

        for (const person of localPeople) {
            this.memory = this.memory.filter(
                memory => !(memory.type === MemoryType.Exists 
                && memory.data.noun.type === NounType.Person 
                && memory.data.noun.data.id === person.id)
            );
            if (person.id !== this.id) {
                this.memory.push(Memory.Exists(Noun.Person(person.id), now));
            }
            this.memory = this.memory.filter(
                memory => !(memory.type === MemoryType.Location 
                && memory.data.noun.type === NounType.Person 
                && memory.data.noun.data.id === person.id)
            );
            if (person.id !== this.id) {
                this.memory.push(Memory.Location({ type: NounType.Person, data: { id: person.id }} as NounPerson, person.x, person.y, now));
            }
        }

        // if we find out an item is missing, remove it from memory
        this.memory = this.memory.filter(memory => {
            if (memory.type != MemoryType.Location || memory.data.noun.type != NounType.Thing) {
                return true;
            }
            if (memory.data.x < this.x - 10 || memory.data.x > this.x + 10 || memory.data.y < this.y - 10 || memory.data.y > this.y + 10) {
                return true;
            }
            const item = local.find(({ x, y }) => x === memory.data.x && y === memory.data.y);
            return !(item == null || item.item == null || !ItemConditions.matches(memory.data.noun.data.selector, item.item.item)); // eww
        });

        // similar but for people
        this.memory = this.memory.filter(memory => {
            if (memory.type != MemoryType.Location || memory.data.noun.type != NounType.Person) {
                return true;
            }
            // if two people move away at the exact time, can unintentionally forget where they are
            if (memory.data.x < this.x - 8 || memory.data.x > this.x + 8 || memory.data.y < this.y - 8 || memory.data.y > this.y + 8) {
                return true;
            }
            const person = localPeople.find(({ x, y }) => x === memory.data.x && y === memory.data.y);
            return !(person == null || person.id === this.id);
        });

        for (const { x, y, item } of local) {
            if (item != null) {
                if (item.item.root) {
                    this.common[item.id] = (this.common[item.id] ?? 0) + 1;
                }
                if (!this.short['justDropped']) {
                    let i = 0;
                    for (const objective of this.objectives.slice(0, this.objectives.length - 1)) {
                        if (objective.type === ObjectiveType.Obtain && !objective.data.another) {
                            if (ItemConditions.matches(objective.data.noun.data.selector, item.item)) {
                                this.completeAltObjective(i);
                                this.memory.push(Memory.Location(objective.data.noun, x, y, now));
                                break;
                            }
                        }
                        i += 1;
                    }
                }
                if (
                    item.item.tags.includes('important') 
                    || item.item.tags.includes('foodSource') 
                    || item.item.tags.includes('heatSource')
                    || item.item.tags.includes('healing') 
                    || item.item.tags.includes('edible')
                ) {
                    this.memory = this.memory.filter(
                        memory => !(memory.type === MemoryType.Location
                        && memory.data.noun.type === NounType.Thing
                        && memory.data.noun.data.selector.conditions.find(
                            (condition: ItemCondition) => condition.type === ItemConditionTypes.Is 
                            && condition.data === item.item.id
                        ))
                    );
                    this.memory.push(Memory.Location(
                        { type: NounType.Thing, data: { selector: { conditions: [{ type: ItemConditionTypes.Is, data: item.item.id }] } } }, 
                        x, y, now
                    ));
                    
                }
            }
        }

        let focus = Needs.Health;
        for (const need of [Needs.Health, Needs.Hunger, Needs.Temperature, Needs.Boredom]) {
            if (this.needs[need] > this.needs[focus]) {
                focus = need;
            }
        }

        // focus = Needs.Hunger;

        if (this.objectives.length === 0 || this.objectives[0].type !== ObjectiveType.FulfillNeed || this.objectives[0].data.need !== focus) {
            this.objectives = [];
            this.addObjective(Objective.FulfillNeed(focus));

        }

        const rootObjective = this.objectives[0];

        if (rootObjective.type === ObjectiveType.FulfillNeed) {
            if (rootObjective.data.need === Needs.Hunger) {
                if (Math.random() < 0.002) {
                    this.objectives = [rootObjective];
                    this.short = {};
                }
            }
        }

        const objective = this.objectives[this.objectives.length - 1];
        this.nextAction = Action.Nothing();

        if (this.short['goto'] != null) {
            if (this.x === this.short['goto'].x && this.y === this.short['goto'].y) {
                this.short['goto'] = null;
            } else {
                if (this.short['calculated']) {
                    // if (this.short['lastIndex'] === this.index()) {
                    //     this.short['path'] = null;
                    // }
                    // let path: { [key: number]: Direction };
                    // if (!this.short['path']) {
                    //     this.short['path'] = this.computePath(world, this.short['goto'].x, this.short['goto'].y, people.map(({ x, y }) => ({ x, y })).filter(({ x, y }) => x !== this.x || y !== this.y));
                    //     this.nextAction = Action.Move(1 + Math.floor(Math.random() * 4) as Direction);
                    // }
                    // if (!this.short['path']) {
                    //     this.short['goto'] = null;
                    //     this.nextAction = Action.Move(1 + Math.floor(Math.random() * 4) as Direction);
                    // } else if (this.nextAction.type === ActionType.Nothing) {
                    //     path = this.short['path'] as { [key: number]: Direction };
                    //     const next = path[this.index()];
                    //     this.short['lastIndex'] = this.index();
                    //     if (!next) {
                    //         this.short['path'] = null;
                    //         this.nextAction = Action.Move(1 + Math.floor(Math.random() * 4) as Direction);
                    //     } else {
                    //         this.nextAction = Action.Move(next);
                    //     }
                    // }
                } else {
                    const dx = this.short['goto'].x - this.x;
                    const dy = this.short['goto'].y - this.y;

                    const worldAtGoto = world.get(this.short['goto'].x, this.short['goto'].y);
                    if (worldAtGoto != null && worldAtGoto.item.tags.includes('blocking')) {
                        this.short['goto'] = this.gotoNoBlocking(world, this.short['goto'].x, this.short['goto'].y);
                    }
                    
                    if (Math.abs(dx) > Math.abs(dy)) { // super simple pathfinding
                        if (dx > 0) {
                            this.nextAction = Action.Move(Direction.Right);
                        } else {
                            this.nextAction = Action.Move(Direction.Left);
                        }
                    } else {
                        if (dy > 0) {
                            this.nextAction = Action.Move(Direction.Down);
                        } else {
                            this.nextAction = Action.Move(Direction.Up);
                        }
                    }
                    const next = indices[this.nextAction.data.direction];
                    if ((world.get(next.x, next.y) != null && world.get(next.x, next.y)?.item.tags.includes('blocking')) 
                        || people.some(person => person.id != this.id && person.x === next.x && person.y === next.y)) {
                        this.nextAction = this.moveRandomly(world, indices);
                    }
                }
            }
        
            //  _  _ ___ ___ ___  ___ 
            // | \| | __| __|   \/ __|
            // | .` | _|| _|| |) \__ \
            // |_|\_|___|___|___/|___/
                                   
        } else if (objective.type === ObjectiveType.FulfillNeed) {

            if (objective.data.need === Needs.Health) {
                if (this.holding != null && this.holding.item.tags.includes('healing')) {
                    this.nextAction = Action.Eat();
                } else if (world.get(this.x, this.y) != null && world.get(this.x, this.y)!.item.tags.includes('healing')) {
                    if (this.holding != null) {
                        this.tryToDrop(world, indices, now);
                    } else {
                        this.nextAction = Action.Interact(Direction.Here);
                    }
                } else {
                    const allHealing = REGISTRY.items.filter(item => item.tags.includes('healing'));
                    this.addObjective(Objective.Obtain(Noun.Thing({ conditions: [{ type: ItemConditionTypes.Is, data: allHealing[Math.floor(Math.random() * allHealing.length)].id }] }), false));
                }



            } else if (objective.data.need === Needs.Hunger) {

                if (this.holding != null && this.holding.item.tags.includes('edible')) {
                    this.nextAction = Action.Eat();
                } else if (world.get(this.x, this.y) != null && world.get(this.x, this.y)!.item.tags.includes('edible')) {
                    if (this.holding != null) {
                        this.tryToDrop(world, indices, now);
                    } else {
                        this.nextAction = Action.Interact(Direction.Here);
                    }
                } else {
                    // priority when NOT SEVERE: make a food source / work towards good food
                    // priority when SEVERE: find food

                    const nutritionScore = (item: Item) => {
                        const food = item.properties.food;
                        const heal = item.properties.heal || 0;

                        return (food + Math.log2(heal + 1)) ** 2;
                    }

                    const foodScore = (item: Item) => {
                        const nutrition = nutritionScore(item);

                        const depth = item.depth();
                        const knowsLocation = this.memory.some(memory => memory.type === MemoryType.Location 
                            && memory.data.noun.type === NounType.Thing 
                            && ItemConditions.matches(memory.data.noun.data.selector, item)
                        );

                        const effort = (Math.log2(depth) * item.required(this.known)) ** (knowsLocation ? 1 : 2) + 1;

                        return (nutrition / effort) * (0.8 + Math.random() * 0.4);
                    }

                    const foodSourceScore = (item: Item) => {
                        const foodItMakes = item.usedIn.map(recipe => recipe.notableResulted().map(id => REGISTRY.getItem(id))).flat().filter(item => item.tags.includes('edible'));
                        const score = foodItMakes.map(nutritionScore).reduce((a, b) => a + b, 0);

                        const depth = 0;
                        const knowsLocation = this.memory.some(memory => memory.type === MemoryType.Location 
                            && memory.data.noun.type === NounType.Thing 
                            && ItemConditions.matches(memory.data.noun.data.selector, item)
                        );

                        const effort = (depth + 1) ** (knowsLocation ? 1 : 2);

                        return (score / effort) * (0.8 + Math.random() * 0.4);
                    }

                    const allEdible = REGISTRY.items.filter(item => item.tags.includes('edible'));
                    const allFoodSources = REGISTRY.items.filter(item => item.tags.includes('foodSource'));

                    if (false && Math.random() > this.hungerSeverity()) {
                        // find food source
                        const foodSources = allFoodSources.filter(item => foodSourceScore(item) > 0);
                        const bestFoodSource = foodSources.sort((a, b) => foodSourceScore(b) - foodSourceScore(a))[0];
                        if (bestFoodSource) {
                            this.addObjective(Objective.Obtain(Noun.Thing({ conditions: [{ type: ItemConditionTypes.Is, data: bestFoodSource.id }] }), false));
                        }
                    } else {
                        // find food
                        const food = allEdible.filter(item => foodScore(item) > 0);
                        const bestFood = food.sort((a, b) => foodScore(b) - foodScore(a))[0];

                        console.table(food.map(item => ({ name: item.name, score: foodScore(item), nutrition: nutritionScore(item), effort: (item.depth() * item.required(this.known)) ** (this.memory.some(memory => memory.type === MemoryType.Location 
                            && memory.data.noun.type === NounType.Thing 
                            && ItemConditions.matches(memory.data.noun.data.selector, item)
                        ) ? 1 : 2) + 1  })));

                        if (bestFood) {
                            this.addObjective(Objective.Obtain(Noun.Thing({ conditions: [{ type: ItemConditionTypes.Is, data: bestFood.id }] }), false));
                        }
                    }
                }
            } else if (objective.data.need === Needs.Temperature || objective.data.need === Needs.Boredom) {
                // fire?
                const fire = REGISTRY.getItem(57);
                const kindling = REGISTRY.getItem(52);
                const fireMemory = this.locationMemory(fire);

                if (fireMemory) {
                    if (this.temperature < 2) {
                        if (world.chunks[this.outerIndex()].items.some(item => item != null && item.item.id === fire.id)) {
                            // randomly move within chunk
                            const dir = [ Direction.Up, Direction.Left, Direction.Down, Direction.Right ].filter(dir => {
                                const next = indices[dir];
                                const chunkIndex = next.x / CHUNK_SIZE + next.y / CHUNK_SIZE * WORLD_SIZE;
                                return chunkIndex === this.outerIndex();
                            });
                            this.nextAction = Action.Move(dir[Math.floor(Math.random() * dir.length)]);
                        } else {
                            this.nextAction = this.moveRandomly(world, indices);
                            this.short['goto'] = this.gotoNoBlocking(world, fireMemory.data.x, fireMemory.data.y);
                        }
                    } else {
                        if (this.holding && this.holding.item.id === kindling.id) {
                            // put kindling near fire
                            if (world.chunks[this.outerIndex()].items.some(item => item != null && item.item.id === fire.id)) {
                                this.tryToDrop(world, indices, now);
                                this.short['goto'] = this.gotoNoBlocking(world, this.x + Math.floor(Math.random() * 10 - 5), this.y + Math.floor(Math.random() * 10 - 5));
                            } else {
                                this.nextAction = this.moveRandomly(world, indices);
                                this.short['goto'] = this.gotoNoBlocking(world, fireMemory.data.x, fireMemory.data.y);
                            }
                        } else if (world.get(this.x, this.y) != null && world.get(this.x, this.y)!.id === kindling.id) {
                            this.nextAction = Action.Interact(Direction.Here);
                        } else {
                            this.addObjective(Objective.Obtain(Noun.Thing({ conditions: [{ type: ItemConditionTypes.Is, data: kindling.id }] }), true));
                            this.short['goto'] = this.gotoNoBlocking(world, this.x + Math.floor(Math.random() * 10 - 5), this.y + Math.floor(Math.random() * 10 - 5));
                        }   
                    }
                } else {
                    this.addObjective(Objective.Obtain(Noun.Thing({ conditions: [{ type: ItemConditionTypes.Is, data: fire.id }] }), false));
                }
            } else if (objective.data.need === Needs.Boredom) {
                // const allImportant = REGISTRY.items.filter(item => item.tags.includes('important'));
                
                // const priority = (item: Item) => {
                //     const knowsLocation = this.memory.some(memory => memory.type === MemoryType.Location 
                //         && memory.data.noun.type === NounType.Thing 
                //         && ItemConditions.matches(memory.data.noun.data.selector, item)
                //     );
                //     if (knowsLocation) {
                //         return 0; // want to craft new items!
                //     }

                //     const effort = (item.depth() * item.required(this.known)) + 1;
                //     return (0.8 + Math.random() * 0.4) / effort;
                // }

                // const bestItem = allImportant.sort((a, b) => priority(b) - priority(a))[0];

                // console.table(allImportant.map(item => ({ name: item.name, priority: priority(item), effort: (item.depth() * item.required(this.known)) + 1 })));

                // this.addObjective(Objective.Obtain(Noun.Thing({ conditions: [{ type: ItemConditionTypes.Is, data: bestItem.id }] }), false));
            }

        //   ___  ___ _____ _   ___ _  _ 
        //  / _ \| _ )_   _/_\ |_ _| \| |
        // | (_) | _ \ | |/ _ \ | || .` |
        //  \___/|___/ |_/_/ \_\___|_|\_|
                                         
        } else if (objective.type === ObjectiveType.Obtain) {
            const item = REGISTRY.getItem(REGISTRY.query(objective.data.noun.data.selector)[0]);
            const memory = this.memory.find(memory => memory.type === MemoryType.Location && memory.data.noun.type === NounType.Thing && ItemConditions.matches(memory.data.noun.data.selector, item));

            if (!objective.data.another && this.holding != null && ItemConditions.matches(objective.data.noun.data.selector, this.holding.item)) {
                this.nextAction = Action.Nothing();
                this.completeObjective();
            } else if (!this.short['justDropped'] && indices.map(i => world.get(i.x, i.y)).some(other => other != null && other.item.id === item.id)) {
                const dir = indices.findIndex(i => world.get(i.x, i.y) != null && world.get(i.x, i.y)!.item.id === item.id);
                this.memory.push(Memory.Location(Noun.Thing({ conditions: [{ type: ItemConditionTypes.Is, data: item.id }] }), 
                    indices[dir].x, indices[dir].y, now
                ));
                this.completeObjective();
            } else if (!objective.data.another && !this.short['justDropped'] && memory) {
                this.short['goto'] = this.gotoNoBlocking(world, memory.data.x, memory.data.y);
            } else if (!item.root) {
                const recipes = item.resultedBy;
                const recipe = recipes.find(recipe => recipe.simpleUsed().map(id => REGISTRY.getItem(id)).every(item => 
                    (this.holding != null && this.holding.id === item.id) ||
                    this.memory.find(memory => 
                        memory.type === MemoryType.Location 
                        && memory.data.noun.type === NounType.Thing
                        && ItemConditions.matches(memory.data.noun.data.selector, item)
                )));
                
                if (recipe) {

                    const shouldBeHolding = recipe.actor;
                    const shouldBeNextTo = recipe.origin;

                    const holdingTheActor = (!!shouldBeHolding && this.holding != null && ItemConditions.matches(shouldBeHolding, this.holding.item)) || (!shouldBeHolding && !this.holding)
                    const nextToOriginIndex = indices.findIndex(i => world.get(i.x, i.y) != null && ItemConditions.matches(shouldBeNextTo, world.get(i.x, i.y)!.item));

                    if (!holdingTheActor) {
                        if (this.holding && (!shouldBeHolding || !ItemConditions.matches(shouldBeHolding, this.holding.item))) {
                            this.tryToDrop(world, indices, now);
                        } else if (indices.some(i => world.get(i.x, i.y) != null && ItemConditions.matches(shouldBeHolding!, world.get(i.x, i.y)!.item))) {
                            this.nextAction = Action.Interact(indices.findIndex(i => world.get(i.x, i.y) != null && world.get(i.x, i.y)!.item.id === shouldBeHolding!.conditions[0].data) as Direction);
                        } else {
                            const item = REGISTRY.getItem(recipe.getAnActor());
                            // find memory
                            const memory = this.memory.find(memory => memory.type === MemoryType.Location && memory.data.noun.type === NounType.Thing && ItemConditions.matches(memory.data.noun.data.selector, item));
                            if (memory) {
                                this.short['goto'] = this.gotoNoBlocking(world, memory.data.x, memory.data.y);
                            } else { // this should hopefully never happen
                                this.addObjective(Objective.Obtain(Noun.Thing({ conditions: [{ type: ItemConditionTypes.Is, data: item.id }] }), true), objective);
                                this.nextAction = Action.Nothing();
                            }
                        }
                    } else if (nextToOriginIndex === -1) {
                        if (this.holding && (!shouldBeHolding || !ItemConditions.matches(shouldBeHolding, this.holding.item))) {
                            this.tryToDrop(world, indices, now);
                        } else {
                            const item = REGISTRY.getItem(recipe.getAnOrigin());
                            // find memory
                            const memory = this.memory.find(memory => memory.type === MemoryType.Location && memory.data.noun.type === NounType.Thing && ItemConditions.matches(memory.data.noun.data.selector, item));
                            if (memory) {
                                this.short['goto'] = this.gotoNoBlocking(world, memory.data.x, memory.data.y);
                            } else { // this should hopefully never happen
                                this.addObjective(Objective.Obtain(Noun.Thing({ conditions: [{ type: ItemConditionTypes.Is, data: item.id }] }), true), objective);
                                this.nextAction = Action.Nothing();
                            }
                        }
                    } else { // able to craft
                        this.nextAction = Action.Interact(nextToOriginIndex as Direction);
                    }

                } else {
                    const itemEffort = (item: Item) => {
                        if (this.objectives.some(objective => objective.type === ObjectiveType.Obtain && ItemConditions.matches(objective.data.noun.data.selector, item) && !objective.data.another)) {
                            return Infinity;
                        }
                        const craftEffort = (item.depth() || 0) ** 2 + 1;
                        const canFindEasily = this.memory.find(memory => 
                            memory.type === MemoryType.Location 
                            && memory.data.noun.type === NounType.Thing 
                            && ItemConditions.matches(memory.data.noun.data.selector, item)
                        ) || local.find(({ item: i }) => i != null && i.item.id === item.id);
                        const howCommon = item.resources().reduce((a, b) => a + (this.common[b.id] ?? 0), 0);

                        return (canFindEasily ? (Math.sqrt(craftEffort) / 2) : craftEffort) / Math.log(howCommon + Math.E) * (0.8 + Math.random() * 0.4);
                    }
                    const recipeEffort = (recipe: Recipe) => {
                        if (recipe.actor && recipe.results.some(result => result.actor && result.actor.type === 'SameItem')) {
                            return Infinity;
                        }
                        return itemEffort(REGISTRY.getItem(recipe.getAnOrigin())) * (recipe.actor ? itemEffort(REGISTRY.getItem(recipe.getAnActor())) : 1) * (recipe.time || 1);
                    }
                    const bestRecipe = recipes.sort((a, b) => recipeEffort(a) - recipeEffort(b))[0];
                    
                    const items = bestRecipe.simpleUsed().map(id => REGISTRY.getItem(id));

                    const seen = new Set<number>();
                    
                    for (const item of items.sort((a, b) => a.active || b.active ? ((a.active === b.active) ? 0 : a.active ? -1 : 1) : a.depth() - b.depth())) {
                        if (seen.has(item.id)) {
                            this.objectives[this.objectives.length - 1].data.another = true;
                        }
                        this.addObjective(Objective.Obtain(Noun.Thing({ conditions: [{ type: ItemConditionTypes.Is, data: item.id }] }), false), objective);
                        seen.add(item.id);
                    }
                    this.nextAction = Action.Nothing();
                }
            } else {
                // first see if in vicinity
                const item = this.nearestItem(local, objective.data.noun.data.selector);
                
                if (item != null && item.item != null) {
                    this.short['goto'] = this.gotoNoBlocking(world, item.x, item.y);
                } else if (this.whereIsItem(objective.data.noun.data.selector)) {
                    const location = this.whereIsItem(objective.data.noun.data.selector)!;
                    this.short['goto'] = this.gotoNoBlocking(world, location.x, location.y);
                } else { // otherwise, go somewhere random!
                    this.short['searched'] = [...(this.short['searched'] ?? []), [this.x, this.y]];
                    let x = Math.min(Math.max(this.x + Math.round(Math.random() * 20 - 10), 0), world.size - 1);
                    let y = Math.min(Math.max(this.y + Math.round(Math.random() * 20 - 10), 0), world.size - 1);
                    let limit = 0;
                    while (this.short['searched'].find(([sx, sy]) => sx > x - 10 && sx < x + 10 && sy > y - 10 && sy < y + 10)) {
                        x = Math.min(Math.max(this.x + Math.round(Math.random() * (20 + limit * 4) - (10 + limit * 2)), 0), world.size - 1);
                        y = Math.min(Math.max(this.y + Math.round(Math.random() * (20 + limit * 4) - (10 + limit * 2)), 0), world.size - 1);
                        limit += 1;
                        if (limit > 10) {
                            break;
                        }
                    }
                    this.short['goto'] = this.gotoNoBlocking(world, x, y);
                }
            }

        }

        if (this.nextAction.type === ActionType.Nothing && Math.random() < 0.5) {
            this.nextAction = this.moveRandomly(world, indices);
        }
        
        
    }

    gotoNoBlocking(world: World, x: number, y: number) {
        console.log('GOTO NOT BLOCKING:', x, y, world.get(x, y), world.get(x,y) && world.get(x, y)!.item.tags.includes('blocking'));
        if (world.get(x, y) != null && world.get(x, y)!.item.tags.includes('blocking')) {
            for (const [xx, yy] of [[x, y + 1], [x, y - 1], [x + 1, y], [x - 1, y]]) {
                if (world.get(xx, yy) == null || !world.get(xx, yy)!.item.tags.includes('blocking')) {
                    return { x: xx, y: yy };
                }
            }
            return { x, y };
        } else {
            return { x, y };
        }
    }

    moveRandomly(world: World, indices: { x: number, y: number }[]) {
        const dirs = [Direction.Up, Direction.Left, Direction.Down, Direction.Right].filter(dir => {
            const next = indices[dir];
            return world.get(next.x, next.y) == null || !world.get(next.x, next.y)!.item.tags.includes('blocking');
        });
        if (dirs.length > 0) {
            return Action.Move(dirs[Math.floor(Math.random() * dirs.length)] as Direction);
        } else {
            return Action.Move(1 + Math.floor(Math.random() * 4) as Direction);
        }
    }
    
    addItemToMemory(world: World, x: number, y: number, now: number) {
        if (world.get(x, y) != null) {
            this.memory.push(Memory.Location(Noun.Thing({ conditions: [{ type: ItemConditionTypes.Is, data: world.get(x, y)!.item.id }] }), x, y, now));
        }
    }

    tryToDrop(world: World, indices: { x: number, y: number }[], now: number) {
        this.short['justDropped'] = true;
        for (let i = 0; i < indices.length; i += 1) {
            if (world.get(indices[i].x, indices[i].y) == null) {
                this.nextAction = Action.Interact(i as Direction);
                this.memory.push(Memory.Location(Noun.Thing({ conditions: [{ type: ItemConditionTypes.Is, data: this.holding!.item.id }] }), indices[i].x, indices[i].y, now));
                return true;
            }
        }
        this.nextAction = this.moveRandomly(world, indices);
        return false;
    }

    nearestItem(world: {x: number, y: number, item: ItemState | null}[], selector: ItemConditions) {
        const items = world.filter(({ item }) => item != null && ItemConditions.matches(selector, item.item));
        if (items.length === 0) {
            return null;
        }
        return items.sort((a, b) => {
            const aDist = (a.x - this.x) ** 2 + (a.y - this.y) ** 2;
            const bDist = (b.x - this.x) ** 2 + (b.y - this.y) ** 2;
            return aDist - bDist;
        })[0];
    }

    nearestItemWithoutNearbyPerson(world: {x: number, y: number, item: ItemState | null}[], selector: ItemConditions, people: Person[]) {
        const items = world.filter(({ item }) => item != null && ItemConditions.matches(selector, item.item));
        if (items.length === 0) {
            return null;
        }
        const peopleDist = items.map(({ x, y }) => people.reduce((a, b) => Math.min(a, (b.x - x) ** 2 + (b.y - y) ** 2), Infinity));
        return items.sort((a, b) => {
            const aDist = ((a.x - this.x) ** 2 + (a.y - this.y) ** 2) / (peopleDist[items.indexOf(a)] + 1);
            const bDist = ((b.x - this.x) ** 2 + (b.y - this.y) ** 2) / (peopleDist[items.indexOf(b)] + 1);
            return aDist - bDist;
        })[0];

    }

    completeAltObjective(index: number) {
        const marked = new Set<number>();
        const queue = [index];
        const map = this.objectives.map(obj => obj.type === ObjectiveType.Obtain ? obj.data.noun : null);

        this.short['goto'] = null;
        this.short['path'] = null;

        while (queue.length > 0) {
            const current = queue.pop()!;
            marked.add(current);
            if (this.objectives[current].type === ObjectiveType.Obtain) {
                this.objectives[current].data.children.forEach((child: number) => {
                    if (!marked.has(child)) {
                        queue.push(child);
                    }
                });
            }
        }
        this.objectives = this.objectives.filter((_, i) => !marked.has(i));
        this.objectives.forEach(objective => {
            if (objective.type === ObjectiveType.Obtain) {
                objective.data.children = objective.data.children.filter((child: number) => !marked.has(child)).map((child: number) => this.objectives.findIndex(obj => obj.data.noun === map[child]));
            }
        });
    }

    /*
    computePath(world: World, x: number, y: number, obstacles: {x: number, y: number}[] = []): { [key: number]: Direction } | null {
        // A* pathfinding, cannot move through items tagged 'blocking'
        // returns a map of which index we're at and which direction to move from there.

        const heuristic = (index: number) => {
            const dx = index % WORLD_SIZE - x;
            const dy = Math.floor(index / WORLD_SIZE) - y;
            return Math.sqrt(dx ** 2 + dy ** 2);
        }

        const obstaclesSet = new Set(obstacles.map(({ x, y }) => y * WORLD_SIZE + x));

        const start = this.index();
        const end = Math.min(Math.max(y, 0), WORLD_SIZE - 1) * WORLD_SIZE + Math.min(Math.max(x, 0), WORLD_SIZE - 1);

        if (start === end) {
            return {};
        }
        if (obstaclesSet.has(end)) {
            return null;
        }

        const open: number[] = [start];
        const closed = new Set<number>();

        const cost: { [key: number]: number } = {};
        const parent: { [key: number]: number | null } = {};

        cost[start] = 0;
        parent[start] = null;

        let i = 0;
        while (open.length > 0) {
            const current = open.reduce((a, b) => cost[a] ?? 0 + heuristic(a) < cost[b] ?? 0 + heuristic(b) ? a : b, open[0]);
            if (current === end) {
                break;
            }
            
            open.splice(open.indexOf(current), 1);
            closed.add(current);

            const neighbors = [
                current - WORLD_SIZE,
                current - 1,
                current + 1,
                current + WORLD_SIZE,
            ];

            for (const neighbor of neighbors) {
                const nx = neighbor % WORLD_SIZE;
                const ny = Math.floor(neighbor / WORLD_SIZE);
                if (nx < 0 || ny < 0 || nx >= WORLD_SIZE || ny >= WORLD_SIZE) {
                    continue;
                }
                if (closed.has(neighbor)) {
                    continue;
                }
                if (obstaclesSet.has(neighbor)) {
                    continue;
                }
                if (world[neighbor] != null && world[neighbor]!.item.tags.includes('blocking')) {
                    continue;
                }
                const newCost = cost[current] + 1;
                if (!open.includes(neighbor)) {
                    open.push(neighbor);
                } else if (newCost >= cost[neighbor]) {
                    continue;
                }
                cost[neighbor] = newCost;
                parent[neighbor] = current;
            }

            i += 1;
            if (i > 10000) {
                console.log('search exceeded 10000 node limit');
                break;
            }
        }

        if (open.length === 0) {
            console.log('ran out of nodes?', i);
        }
        
        if (parent[end] == null) {
            console.log('no path found', this.x, this.y, x, y);
            return null;
        }

        const path: { [key: number]: Direction } = {};
        let current = end;
        while (current !== start) {
            const next = parent[current]!;
            if (next === current - WORLD_SIZE) {
                path[next] = Direction.Down;
            } else if (next === current - 1) {
                path[next] = Direction.Right;
            } else if (next === current + 1) {
                path[next] = Direction.Left;
            } else if (next === current + WORLD_SIZE) {
                path[next] = Direction.Up;
            }
            current = next;
        }
        return path;
    } */

    locationMemory(item: Item) {
        return this.memory.find(memory => memory.type === MemoryType.Location && memory.data.noun.type === NounType.Thing && ItemConditions.matches(memory.data.noun.data.selector, item));
    }

    whereIsItem(item: ItemConditions) {
        const memory = this.memory.find(memory => 
            memory.type === MemoryType.Location 
            && memory.data.noun.type === NounType.Thing 
            && ItemConditions.matches( 
                item,
                REGISTRY.getItem(REGISTRY.query(memory.data.noun.data.selector)[0] || 0)
            ));
        if (memory == null) {
            return null;
        }
        return memory.data;
    }

    completeObjective() {
        const lastIndex = this.objectives.length - 1;
        this.objectives.forEach(objective => {
            if (objective.type === ObjectiveType.Obtain) {
                objective.data.children = objective.data.children.filter((child: number) => child !== lastIndex);
            }
        });
        this.objectives.pop();
        this.short = {};
    }

    addObjective(objective: Objective, parent?: Objective) {
        if (parent != null && parent.type === ObjectiveType.Obtain && objective.type === ObjectiveType.Obtain) {
            parent.data.children.push(this.objectives.length);
        }
        this.objectives.push(objective);
        this.short = {};
    }

    act() {
        if (this.nextAction != null) {
            return this.nextAction;
        } else {
            return Action.Nothing();
        }
    }

    outerIndex() {
        return Math.floor(this.y / CHUNK_SIZE) * WORLD_SIZE + Math.floor(this.x / CHUNK_SIZE);
    }

    innerIndex() {
        return (this.y % CHUNK_SIZE) * CHUNK_SIZE + (this.x % CHUNK_SIZE);
    }
    
}

export function generateGroup(now: number, world: World) {
    const surname = generateName();
    const size = Math.round(Math.random() * 4 + 2);
    const x = Math.round(Math.random() * world.size);
    const y = Math.round(Math.random() * world.size);

    const group: Person[] = [];
    const takenPositions: [number, number][] = [];

    for (let i = 0; i < size; i += 1) {
        const name = generateName();
        let px = x;
        let py = y;
        while (takenPositions.find(([tx, ty]) => tx === px && ty === py) || world.get(px, py) != null) {
            px = Math.min(Math.max(x + Math.round(Math.random() * 20 - 10), 0), world.size - 1);
            py = Math.min(Math.max(y + Math.round(Math.random() * 20 - 10), 0), world.size - 1);
        }
        takenPositions.push([px, py]);
        group.push(new Person(generateId(), name, surname, now, px, py));
    }
    for (const person of group) {
        for (const other of group) {
            if (person === other) {
                continue;
            }
            person.reputations[other.id] = 100;
            person.memory.push(Memory.Exists(Noun.Person(other.id), now));
            person.health = 80 + Math.random() * 20;
            person.home = { x, y };
        }
    }
    return group;
}

export function assignReputations(people: Person[]) {
    for (const person of people) {
        for (const other of people) {
            if (person === other) {
                continue;
            }
            if (person.reputations[other.id] === undefined) {
                person.reputations[other.id] = 0;
            }
            if (person.female() != other.female()) { // heterosexual FOR NOW :)
                person.reputations[other.id] += 50;
            }
            person.reputations[other.id] += Math.round(Math.random() * 20 - 10);
        }
    }

}

