import itemsData from './items.json';
import recipesData from './recipes.json';

interface ItemDisplay {
    character: number;
    color: number;
}

export class Item {
    id: number;
    name: string;
    tags: string[];
    display: ItemDisplay[];
    properties: { [key: string]: number } = {};

    static DEFAULT_ITEM = new Item(0, '', [], [{ character: 0, color: 0 }]);

    constructor(id: number, name: string, tags: string[], display: ItemDisplay[], properties: { [key: string]: number } = {}) {
        this.id = id;
        this.name = name;
        this.tags = tags;
        this.display = display;
        this.properties = properties;
    }

    get usedIn(): Recipe[] {
        return ((REGISTRY && REGISTRY.uses.get(this.id)?.map((id) => REGISTRY.getRecipe(id))) || []).filter((recipe, i, a) => a.indexOf(recipe) === i);
    }

    get resultedBy(): Recipe[] {
        return ((REGISTRY && REGISTRY.results.get(this.id)?.map((id) => REGISTRY.getRecipe(id))) || []).filter((recipe, i, a) => a.indexOf(recipe) === i);
    }

    get active(): boolean {
        return this.usedIn.some((recipe) => recipe.time);
    }

    get root(): boolean {
        return this.tags.includes('root') || this.tags.includes('natural') || this.resultedBy.length === 0;
    }
    
    depth(): number {
        return REGISTRY.depths.get(this.id) || 0;
    }

    resources(): Item[] {
        return [];
    }

    required(has: number[] = [], seen: Set<number> = new Set()): number {
        if (has.includes(this.id) || seen.has(this.id)) {
            return 0;
        }
        seen.add(this.id);
        if (this.root) {
            return 1;
        }
        return this.resultedBy.reduce((acc, recipe) => acc + recipe.used().reduce((acc, item) => acc + REGISTRY.getItem(item).required(has, seen), 0), 0);
    }
    
    // recursive
    isNeededToMake(item: Item): boolean {
        if (this.id === item.id) {
            return true;
        }
        if (this.root) {
            return false;
        }
        return this.resultedBy.some((recipe) => REGISTRY.getItem(recipe.getAnOrigin()).isNeededToMake(item) || (recipe.actor && REGISTRY.getItem(recipe.getAnActor()).isNeededToMake(item)));
    }

}

export class ItemState {
    id: number;
    value: number = 0;
    time: number = 0;
    inside?: ItemState[];
    
    constructor(id: number) {
        this.id = id;
    }

    get item(): Item {
        return REGISTRY.getItem(this.id);
    }

    clone(): ItemState {
        let clone = new ItemState(this.id);
        clone.value = this.value;
        clone.time = this.time;
        return clone;
    }
}

export enum ItemConditionTypes {
    None = '',
    All = 'All',
    Is = 'Is',
    IsNot = 'IsNot',
    WithTag = 'WithTag',
    WithoutTag = 'WithoutTag',
    PropertyIs = 'PropertyIs',
    PropertyIsNot = 'PropertyIsNot',
};

function cmp(inp: number, op: string, ref: number): boolean {
    switch (op) {
        case '=':
            return inp === ref;
        case '>':
            return inp > ref;
        case '<':
            return inp < ref;
        case '>=':
            return inp >= ref;
        case '<=':
            return inp <= ref;
        default:
            return false;
    }
}

export class ItemCondition {
    type: ItemConditionTypes;
    data: any;

    static matches(item: Item, condition: ItemCondition): boolean {
        switch (condition.type) {
            case ItemConditionTypes.All:
                return true;
            case ItemConditionTypes.Is:
                return item.id === condition.data;
            case ItemConditionTypes.IsNot:
                return item.id !== condition.data;
            case ItemConditionTypes.WithTag:
                return item.tags.indexOf(condition.data) > -1;
            case ItemConditionTypes.WithoutTag:
                return item.tags.indexOf(condition.data) === -1;
            case ItemConditionTypes.PropertyIs:
                return cmp(item.properties[condition.data.property], condition.data.op, condition.data.ref);
            case ItemConditionTypes.PropertyIsNot:
                return !cmp(item.properties[condition.data.property], condition.data.op, condition.data.ref);
            default:
                return false;
        }
    }
}

export class ItemConditions {
    conditions: ItemCondition[];
    
    static matches(condition: ItemConditions, item: Item): boolean {
        return condition.conditions.every((c) => ItemCondition.matches(item, c));
    }
}

enum RecipeResultType {
    None = '',
    SameItem = 'SameItem',
    NewItem = 'NewItem',
}

type RecipeResult = { type: RecipeResultType, data: any };
type RecipeResults = { origin: RecipeResult, actor?: RecipeResult, chance?: number }[];
export class Recipe {
    id: number;
    origin: ItemConditions;
    originValue?: { op: string, ref: number };
    time?: number;

    actor?: ItemConditions;
    actorValue?: { op: string, ref: number };

    results: RecipeResults = [];

    constructor(id: number, origin: ItemConditions, results: RecipeResults, options: Partial<Recipe>) {
        this.id = id;
        this.origin = origin;
        this.results = results;
        this.originValue = options.originValue;
        this.time = options.time;
        this.actor = options.actor;
    }

    willOccur(origin: ItemState, actor: ItemState | null, now: number) {
        return ItemConditions.matches(this.origin, origin.item) && (
            (!this.originValue || cmp(origin.value, this.originValue.op, this.originValue.ref))
            && (!this.time || now - origin.time >= this.time) 
            && (!this.actor || (actor && (
                ItemConditions.matches(this.actor, actor.item)
                && (!this.actorValue || cmp(actor.value, this.actorValue.op, this.actorValue.ref))
            )))
        );
    }

    static getRandomResult(results: RecipeResults, random: number): { origin: RecipeResult, actor?: RecipeResult } {
        if (results.length === 0) {
            return { origin: { type: RecipeResultType.None, data: null } };
        }
        if (results.length === 1) {
            return results[0];
        }
        let total = 0;
        for (let i = 0; i < results.length; i++) {
            total += results[i].chance || 1;
        }
        let r = 0;
        for (let i = 0; i < results.length; i++) {
            r += (results[i].chance || 1) / total;
            if (r >= random) {
                return results[i];
            }
        }
        return results[0];
    }

    origins(): number[] {
        return (REGISTRY && REGISTRY.query(this.origin)) || [];
    }

    actors(): number[] {
        return (REGISTRY && REGISTRY.query(this.actor || { conditions: [{ type: ItemConditionTypes.None, data: null }] })) || [];
    }

    used(): number[] {
        return [...this.origins(), ...this.actors()];
    }

    simpleUsed(): number[] {
        return [...(this.getAnOrigin() === 0 ? [] : [ this.getAnOrigin() ]), ...(this.getAnActor() === 0 ? [] : [ this.getAnActor() ])];
    }

    resulted(): number[] {
        const resulted: number[] = [];
        for (const result of this.results) {
            if (result.origin.type === RecipeResultType.NewItem) {
                resulted.push(result.origin.data);
            } else if (result.origin.type === RecipeResultType.SameItem) {
                resulted.push(...this.origins());
            }
            if (result.actor) {
                if (result.actor.type === RecipeResultType.NewItem) {
                    resulted.push(result.actor.data);
                } else if (result.actor.type === RecipeResultType.SameItem) {
                    resulted.push(...this.actors());
                }
            }
        }
        // remove duplicates
        return resulted.filter((v, i, a) => a.indexOf(v) === i);
    }

    notableResulted(): number[] {
        const resulted: number[] = [];
        for (const result of this.results) {
            if (result.origin.type === RecipeResultType.NewItem) {
                resulted.push(result.origin.data);
            }
            if (result.actor) {
                if (result.actor.type === RecipeResultType.NewItem) {
                    resulted.push(result.actor.data);
                }
            }
        }
        // remove duplicates
        return resulted.filter((v, i, a) => a.indexOf(v) === i);
    }

    getAnOrigin(): number {
        return this.origins()[0] || 0;
    }

    getAnActor(): number {
        return this.actor ? this.actors()[0] || 0 : 0;
    }

    static getResult(item: ItemState, result: RecipeResult) {
        let newItem: ItemState | null = null;
        switch (result.type) {
            case RecipeResultType.SameItem:
                newItem = item.clone();
                if (result.data) {
                    switch (result.data.op) {
                        case '=':
                            newItem.value = result.data.ref;
                            break;
                        case '+':
                            newItem.value += result.data.ref;
                            break;
                        case '-':
                            newItem.value -= result.data.ref;
                            break;
                    }
                }
                break;
            case RecipeResultType.NewItem:
                newItem = new ItemState(result.data);
                break;
        }
        return newItem;
    }

    static getOptionalResult(item: ItemState | null | undefined, result: RecipeResult) {
        let newItem: ItemState | null = null;
        switch (result.type) {
            case RecipeResultType.SameItem:
                if (!item) {
                    return null;
                }
                console.log(item);
                newItem = item.clone();
                if (result.data) {
                    switch (result.data.op) {
                        case '=':
                            newItem.value = result.data.ref;
                            break;
                        case '+':
                            newItem.value += result.data.ref;
                            break;
                        case '-':
                            newItem.value -= result.data.ref;
                            break;
                    }
                }
                break;
            case RecipeResultType.NewItem:
                newItem = new ItemState(result.data);
                break;
        }
        return newItem;
    }

    getResults(origin: ItemState, actor?: ItemState, random?: number): [ItemState | null, ItemState | null] {
        if (this.results.length === 0) {
            return [null, null];
        }
        const result = !random ? this.results[0] : Recipe.getRandomResult(this.results, random);
        let originResult: ItemState | null = Recipe.getResult(origin, result.origin);
        let actorResult: ItemState | null = result.actor ? Recipe.getOptionalResult(actor, result.actor) : null;
        return [originResult, actorResult];
    }

}

class Registry {
    public items: Item[] = [];
    public depths: Map<number, number> = new Map();

    public recipes: Recipe[] = [];
    public uses: Map<number, number[]> = new Map();
    public results: Map<number, number[]> = new Map();

    constructor() {
        this.items = [];
        this.recipes = [];
    }

    setItems(itemsData: any[]) {
        itemsData = [Item.DEFAULT_ITEM, ...itemsData];
        itemsData.forEach((itemData) => {
            const id = this.items.length;
            this.items.push(new Item(id, itemData.name, itemData.tags, itemData.display, itemData.properties));
        });
    }

    setRecipes(recipesData: any[]) {
        recipesData.forEach((recipeData) => {
            const id = this.recipes.length;
            this.recipes.push(new Recipe(id, recipeData.origin, recipeData.results, recipeData));
        });
    }

    refresh() {
        this.recipes.forEach((_, i) => {
            this.recipes[i].used().forEach((id) => {
                if (!this.uses.has(id)) {
                    this.uses.set(id, []);
                }
                this.uses.get(id)?.push(i);
            });
            this.recipes[i].notableResulted().forEach((id) => {
                if (!this.results.has(id)) {
                    this.results.set(id, []);
                }
                this.results.get(id)?.push(i);
            });
        });
        
        for (const item of this.items) {
            if (item.root) {
                this.depths.set(item.id, 0);
            }
        }

        let changed = true;
        while (changed) {
            changed = false;
            for (const item of this.items) {
                if (item.root || this.depths.has(item.id)) {
                    continue;
                }
                const recipes = item.resultedBy.filter((recipe) => recipe.used().every((result) => this.depths.has(result)));
                if (recipes.length === 0) {
                    continue;
                }
                const depth = Math.max(...recipes.map((recipe) => Math.max(...recipe.used().map((result) => this.depths.get(result) || 0)))) + 1;
                this.depths.set(item.id, depth);
                changed = true;
            }
        }
    }

    query(condition: ItemConditions): number[] {
        let results: number[] = [];
        this.items.forEach((item) => {
            if (ItemConditions.matches(condition, item)) {
                results.push(item.id);
            }
        });
        return results;
    }

    itemsData(): string {
        return JSON.stringify(this.items.map((item) => ({ ...item, id: undefined })));
    }

    recipesData(): string {
        return JSON.stringify(this.recipes.map((recipe) => ({ ...recipe, id: undefined })));
    }

    get itemCount(): number {
        return this.items.length;
    }

    public getItem(id: number): Item {
        return this.items[id] || Item.DEFAULT_ITEM;
    }

    public getRecipe(id: number): Recipe {
        return this.recipes[id];
    }
}

export const REGISTRY = new Registry();
REGISTRY.setItems(itemsData);
REGISTRY.setRecipes(recipesData);
REGISTRY.refresh();

export const refreshRegistry = () => {
    REGISTRY.setItems(JSON.parse(REGISTRY.itemsData()));
    REGISTRY.setRecipes(JSON.parse(REGISTRY.recipesData()));
    REGISTRY.refresh();
}