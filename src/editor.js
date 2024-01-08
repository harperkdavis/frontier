const editor = {
    tab: localStorage.getItem('tab') || 'items',
    page: 0,
    selectedItem: 0,
    actorItem: 0,
    originResultItem: 0,
    actorResultItem: 0,
    workingItem: null,
    workingRecipe: null,
    offX: 0,
    offY: 0,
    targetX: 0,
    targetY: 0,
};

function getEditorInput(num) {
    return document.getElementById('editor-input-' + num);
}

function drawButton(x, y, w, h, t, callback) {
    const hovered = mouseIsWithin(x, y, w, h);
    if (hovered) {
        fill(200, 0, 200);
    } else {
        fill(100, 0, 100);
    }
    if (hovered && input.mouse[LEFT] === 1) {
        fill(255, 0, 255);
        callback();
    }
    rect(x, y, w, h);
    fill(255);
    textAlign(CENTER, CENTER);
    textFont(Fonts.bold);
    text(t, x + w / 2, y + h / 2 - 2);
}

function drawItemsPage() {
    if (!editor.cp437counts) {
        editor.cp437counts = {};
        for (const item of REGISTRY.items) {
            for (const display of item.display) {
                editor.cp437counts[display.character] = (editor.cp437counts[display.character] || 0) + 1;
            }
        }
        editor.cp437max = 0;
        for (const key in editor.cp437counts) {
            editor.cp437max = max(editor.cp437max, editor.cp437counts[key]);
        }
    }
    if (!editor.workingItem) {
        editor.workingItem = JSON.parse(JSON.stringify(REGISTRY.getItem(0)));
        delete editor.workingItem.id;
        editor.page = floor((REGISTRY.itemCount - 1) / 32);

        
    }
    fill(255);
    
    for (let i = 0; i < 32; i += 1) {
        
        textAlign(LEFT, TOP);
        
        const index = i + editor.page * 32;
        const selected = index === editor.selectedItem;

        if (index >= REGISTRY.itemCount) {
            break;
        }
        const item = REGISTRY.getItem(index);

        const offX = floor(i / 16) * width / 2;
        
        fill(selected ? 100 : (i % 2 === 0 ? 20 : 40));
        rect(offX, 64 + (i%16) * 32, width / 2, 32);
        fill(0);
        rect(offX + 4, 64 + (i%16) * 32 + 4, 24, 24);
        if (mouseIsWithin(offX + 0, 64 + (i%16) * 32, width / 2, 32) && input.mouse[LEFT] === 1) {
            editor.workingItem = JSON.parse(JSON.stringify(item));
            delete editor.workingItem.id;
        }
        drawItem(item.display, offX + 8, (i%16) * 32 + 72);
        textFont(Fonts.bold);
        fill(255);
        text('(' + index + ') ' + item.name, offX + 32, 64 + (i%16) * 32 + 6);
        noStroke();
        drawButton(offX + width / 2 - 320, 64 + (i%16) * 32 + 4, 84, 24, 'Select (O)', () => {
            editor.selectedItem = index;
        });
        drawButton(offX + width / 2 - 90, 64 + (i%16) * 32 + 4, 64, 24, 'Tree', () => {
            editor.selectedItem = index;
            editor.tab = 'tree';
            editor.targetX = 0;
            editor.targetY = 0;
            editor.offX = 0;
            editor.offY = 0;
        });
        if (editor.selectedItem > 0) {
            drawButton(offX + width / 2 - 232, 64 + (i%16) * 32 + 4, 40, 24, '(A)', () => {
                editor.actorItem = index;
            });
            drawButton(offX + width / 2 - 188, 64 + (i%16) * 32 + 4, 40, 24, '(OR)', () => {
                editor.originResultItem = index;
            });
            drawButton(offX + width / 2 - 144, 64 + (i%16) * 32 + 4, 40, 24, '(AR)', () => {
                editor.actorResultItem = index;
            });
        }
        
        if (selected) {
            stroke(255);
            noFill();
            rect(offX + width / 2 - 320, 64 + (i%16) * 32 + 4, 84, 24);
        }
        if (editor.actorItem === index) {
            stroke(255);
            noFill();
            rect(offX + width / 2 - 232, 64 + (i%16) * 32 + 4, 40, 24);
        } 
        if (editor.originResultItem === index) {
            stroke(255);
            noFill();
            rect(offX + width / 2 - 188, 64 + (i%16) * 32 + 4, 40, 24);
        } 
        if (editor.actorResultItem === index) {
            stroke(255);
            noFill();
            rect(offX + width / 2 - 144, 64 + (i%16) * 32 + 4, 40, 24);
        } 
        noStroke();
    }
    if ((input.keys[RIGHT_ARROW] === 1 || input.keys['D'.charCodeAt(0)] === 1) && document.activeElement.tagName !== 'INPUT') {
        editor.page += 1;
        if (editor.page * 32 >= REGISTRY.itemCount) {
            editor.page -= 1;
        }
    } else if ((input.keys[LEFT_ARROW] === 1 || input.keys['A'.charCodeAt(0)] === 1) && document.activeElement.tagName !== 'INPUT') {
        editor.page -= 1;
        if (editor.page < 0) {
            editor.page = 0;
        }
    }
    drawButton(0, 64 + 32 * 16, 64, 32, 'PREV', () => {
        editor.page -= 1;
        if (editor.page < 0) {
            editor.page = 0;
        }
    });
    drawButton(64, 64 + 32 * 16, 64, 32, 'NEXT', () => {
        editor.page += 1;
        if (editor.page * 32 >= REGISTRY.itemCount) {
            editor.page -= 1;
        }
    });

    noFill();
    stroke(255);
    rect(128, 576, width - 128, height - 576 - 1);
    rect(128 + 16, 576 + 16, 140, 140);
    textSize(128);
    textAlign(LEFT, TOP);
    noStroke();
    drawItem(editor.workingItem.display, 128 + 22, 576 + 22);
    noStroke();
    textSize(16);
    for (let i = 0; i < editor.workingItem.display.length; i += 1) {
        drawButton(128 + 16 + i * 32, 576 + 16 + 140 + 8, 32, 32, i, () => {
            if (editor.workingItem.display.length > 1)
                editor.workingItem.display = [...editor.workingItem.display.slice(0, i), ...editor.workingItem.display.slice(i + 1)];
        });
    }
    drawButton(128 + 16, 576 + 16 + 140 + 40, 140, 32, '+', () => {
        editor.workingItem.display = [...editor.workingItem.display, {...editor.workingItem.display[editor.workingItem.display.length - 1]}];  
    });
    const lastDisplay = editor.workingItem.display[editor.workingItem.display.length - 1];
    fill(COLORS[lastDisplay.color]);
    textFont(Fonts.pixel);
    textSize(12);
    textAlign(LEFT, TOP);
    for (let i = 0; i < 256; i += 1) {
        const x = i % 16;
        const y = floor(i / 16);
        fill((editor.cp437counts[i] ?? 0) / editor.cp437max * 255);
        rect(300 + x * 12, 576 + 16 + y * 12, 12, 12);
        fill(COLORS[lastDisplay.color]);
        text(CP_437[i], 300 + x * 12, 576 + 16 + y * 12);
        if (i === lastDisplay.character) {
            stroke(255);
            noFill();
            rect(300 + x * 12, 576 + 16 + y * 12, 12, 12);
            noStroke();
        } 
        if (mouseIsWithin(300 + x * 12, 576 + 16 + y * 12, 12, 12) && input.mouse[LEFT] === 1) {
            lastDisplay.character = i;
        }
    }
    for (let i = 0; i < 64; i += 1) {
        const x = i % 8;
        const y = floor(i / 8);
        fill(COLORS[i]);
        if (i === lastDisplay.color) {
            stroke(255);
        } else {
            noStroke();
        }
        rect(500 + x * 16 + 4, 576 + 16 + y * 16 + 4, 16, 16);
        if (mouseIsWithin(500 + x * 16 + 4, 576 + 16 + y * 16 + 4, 16, 16) && input.mouse[LEFT] === 1) {
            lastDisplay.color = i;
        }
    }
    textSize(16);
    fill(255);
    editor.workingItem.name = getEditorInput(0).value.trim();
    editor.workingItem.tags = getEditorInput(1).value.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    textAlign(LEFT, TOP);
    textFont(Fonts.regular);
    text('Name: `' + editor.workingItem.name + '`', 700, 576 + 16);
    text('Tags: ', 700, 576 + 40);
    text('Properties: ', 700, 576 + 100);
    let tagX = 0;
    for (const tag of editor.workingItem.tags) {
        fill(50);
        rect(750 + tagX, 576 + 40, textWidth(tag) + 16, 32);
        fill(255);
        text(tag, 750 + tagX + 8, 576 + 40 + 8);
        tagX += textWidth(tag) + 18;
    }
    tagX = 0;
    textFont(Fonts.bold);
    for (const key in editor.workingItem.properties) {
        const value = editor.workingItem.properties[key];
        const txt = `"${key}":${value}`;
        drawButton(800 + tagX, 576 + 100, textWidth(txt) + 16, 32, txt, () => {
            delete editor.workingItem.properties[key];
        })
        tagX += textWidth(txt) + 18;
    }
    textAlign(LEFT, TOP);
    textFont(Fonts.bold);
    text('NAME', width - 720, height - 60);
    text('TAGS', width - 545, height - 60);
    text('PROPERTY', width - 365, height - 60);
    text('VALUE', width - 190, height - 60);
    drawButton(width - 100, height - 70, 50, 24, 'ADD', () => {
        const value = parseInt(getEditorInput(3).value.trim());
        if (isNaN(value)) return;
        editor.workingItem.properties[getEditorInput(2).value.trim()] = value;
        getEditorInput(2).value = '';
        getEditorInput(3).value = '';
    });

    drawButton(500, height - 40, 200, 32, 'COPY TO CLIPBOARD', () => {
        navigator.clipboard.writeText(JSON.stringify(editor.workingItem));

    });
}

function drawRecipesPage() {
    if (!editor.workingRecipe) {
        let origin = [];
        if (editor.selectedItem > 0) {
            origin = [{ type: 'Is', data: editor.selectedItem }];
        }
        let actor = undefined;
        if (editor.actorItem > 0) {
            actor = {conditions: [{ type: 'Is', data: editor.actorItem }]};
        }
        let results = [{ origin: {type: ''}, actor: {type: ''}}];
        if (editor.actorResultItem > 0 || editor.originResultItem > 0) {
            let origin = { type: '', data: undefined };
            if (editor.originResultItem > 0) {
                origin = { 
                    type: editor.originResultItem === editor.selectedItem ? 'SameItem' : 'NewItem',
                    data: editor.originResultItem === editor.selectedItem ? { op: '', ref: 0 } : editor.originResultItem
                };
            }
            let actor = { type: '', data: undefined }
            if (editor.actorResultItem > 0) {
                actor = { 
                    type: editor.actorResultItem === editor.actorItem ? 'SameItem' : 'NewItem',
                    data: editor.actorResultItem === editor.actorItem ? { op: '', ref: 0 } : editor.actorResultItem
                };
            }
            results = [{ origin, actor }];
        }
        editor.workingRecipe = new Recipe(0, { conditions: origin }, results, { actor })
        delete editor.workingRecipe.id;
    }

    noFill();
    stroke(255);
    rect(100, 128, 140, 140);
    if (!editor.workingRecipe.time) {
        rect(300, 128, 140, 140);
    }
    for (let i = 0; i < editor.workingRecipe.results.length; i += 1) {
        rect(600, 128 + 240 * i, 140, 140);
        rect(800, 128 + 240 * i, 140, 140);
    }

    line(250, 200, 290, 200);
    line(270, 180, 270, 220);

    line(450, 200, 590, 200);
    line(570, 180, 590, 200);
    line(570, 220, 590, 200);
    textSize(128);
    textAlign(LEFT, TOP);
    noStroke();
    const originQuery = editor.workingRecipe.origin ? REGISTRY.query(editor.workingRecipe.origin) : [];
    const originItem = REGISTRY.getItem(originQuery[0] || 0);
    const actorQuery = editor.workingRecipe.actor ? REGISTRY.query(editor.workingRecipe.actor) : [];
    const actorItem = REGISTRY.getItem(actorQuery[0] || 0);
    drawItem(originItem.display, 104, 132);
    drawItem(actorItem.display, 304, 132);
    
    fill(255);
    textSize(16);
    textFont(Fonts.bold);
    text(originItem.name || '<EMPTY>', 100, 80);
    if (!editor.workingRecipe.time) {
        textFont(Fonts.regular);
        text(actorItem.name || '<EMPTY>' + ' (Hands)', 300, 100);
    } else {
        textFont(Fonts.bold);
        textAlign(CENTER, CENTER);
        textSize(16);
        text('TIME', 370, 120);
        textSize(32);
        text(editor.workingRecipe.time + 's', 370, 150);
        fill(200);
        textSize(16);
        textFont(Fonts.regular);
        text(floor(editor.workingRecipe.time / 60) + 'm, ' + floor(editor.workingRecipe.time / 3600) + 'h, ' + floor(editor.workingRecipe.time / 86400) + 'd', 370, 180);

        drawButton(380, 200, 40, 16, '+1s', () => {
            editor.workingRecipe.time += 1;
        });
        drawButton(320, 200, 40, 16, '-1s', () => {
            editor.workingRecipe.time -= 1;
        });
        drawButton(380, 220, 40, 16, '+1m', () => {
            editor.workingRecipe.time += 60;
        });
        drawButton(320, 220, 40, 16, '-1m', () => {
            editor.workingRecipe.time -= 60;
        });
        drawButton(380, 240, 40, 16, '+1h', () => {
            editor.workingRecipe.time += 3600;
        });
        drawButton(320, 240, 40, 16, '-1h', () => {
            editor.workingRecipe.time -= 3600;
        });
        drawButton(380, 260, 40, 16, '+1d', () => {
            editor.workingRecipe.time += 86400;
        });
        drawButton(320, 260, 40, 16, '-1d', () => {
            editor.workingRecipe.time -= 86400;
        });
    }

    

    textAlign(LEFT, TOP)
    for (let i = 0; i < editor.workingRecipe.results.length; i += 1) {
        const result = editor.workingRecipe.results[i];
        let origin = 0;
        if (result.origin.type === 'NewItem') {
            origin = result.origin.data;
        } else if (result.origin.type === 'SameItem') {
            origin = originItem.id;
        }
        let actor = 0;
        if (result.origin.type === 'NewItem') {
            actor = result.actor.data;
        } else if (result.origin.type === 'SameItem') {
            actor = actorItem.id;
        }
        const originResult = REGISTRY.getItem(origin);
        const actorResult = REGISTRY.getItem(actor);
        textAlign(LEFT, TOP);
        textSize(128);
        drawItem(originResult.display, 604, 132 + 240 * i);
        drawItem(actorResult.display, 804, 132 + 240 * i);

        
        fill(255);
        textSize(16);
        textFont(Fonts.bold);
        text(`${originResult.name || '<EMPTY>'} (${result.origin.type || 'None'})`, 600, 80 + i * 240);
        textFont(Fonts.regular);
        text(`${actorResult.name || '<EMPTY>'} (${result.actor.type || 'None'}) (Hands)`, 800, 100 + i * 240);

        textSize(8);
        drawButton(600, 270 + i * 240, 40, 20, 'NONE', () => {
            result.origin = { type: '' };
        });
        drawButton(640, 270 + i * 240, 40, 20, 'SAME', () => {
            result.origin = { type: 'SameItem', data: { op: '~', ref: 0 } };
        });
        drawButton(680, 270 + i * 240, 40, 20, 'NEW', () => {
            result.origin = { type: 'NewItem', data: editor.originResultItem };
        });

        drawButton(800, 270 + i * 240, 40, 20, 'NONE', () => {
            result.actor = { type: '' };
        });
        drawButton(840, 270 + i * 240, 40, 20, 'SAME', () => {
            result.actor = { type: 'SameItem', data: { op: '~', ref: 0 } };
        });
        drawButton(880, 270 + i * 240, 40, 20, 'NEW', () => {
            result.actor = { type: 'NewItem', data: editor.actorResultItem };
        });

        textSize(16);
        let j = 0;
        for (const op of ['~', '=', '+', '-']) {
            if (result.origin.type === 'SameItem') {
                drawButton(1000, 100 + i * 240 + j * 40, 30, 30, op, () => {
                    result.origin.data.op = op;
                });
            }
            if (result.actor.type === 'SameItem') {
                drawButton(1200, 100 + i * 240 + j * 40, 30, 30, op, () => {
                    result.actor.data.op = op;
                });
            }
            j += 1;
        }

        fill(255);
        textAlign(LEFT, TOP);
        if (result.origin.type === 'SameItem' && ['=', '+', '-'].includes(result.origin.data.op)) {
            text(result.origin.data.op + ' ' + result.origin.data.ref, 1050, 100 + i * 240);
            drawButton(1050, 150 + i * 240, 30, 30, '-1', () => {
                result.origin.data.ref -= 1;
            });
            drawButton(1050, 190 + i * 240, 30, 30, '+1', () => {
                result.origin.data.ref += 1;
            });
            drawButton(1090, 150 + i * 240, 30, 30, '-10', () => {
                result.origin.data.ref -= 10;
            });
            drawButton(1090, 190 + i * 240, 30, 30, '+10', () => {
                result.origin.data.ref += 10;
            });
        }
        if (result.actor.type === 'SameItem' && ['=', '+', '-'].includes(result.actor.data.op)) {
            text(result.actor.data.op + ' ' + result.actor.data.ref, 1250, 100 + i * 240);
            drawButton(1250, 150 + i * 240, 30, 30, '-1', () => {
                result.actor.data.ref -= 1;
            });
            drawButton(1250, 190 + i * 240, 30, 30, '+1', () => {
                result.actor.data.ref += 1;
            });
            drawButton(1290, 150 + i * 240, 30, 30, '-10', () => {
                result.actor.data.ref -= 10;
            });
            drawButton(1290, 190 + i * 240, 30, 30, '+10', () => {
                result.actor.data.ref += 10;
            });
        }
        textAlign(CENTER, CENTER);
        fill(255);
        if (editor.workingRecipe.results.length > 1) {
            result.chance = result.chance || 1;
            textSize(32);
            text(result.chance, 1400, 150 + i * 240);
            textSize(16);
            text('CHANCE', 1400, 120 + i * 240);
            drawButton(1355, 200 + i * 240, 40, 40, '-1', () => {
                result.chance -= 1;
            });
            drawButton(1405, 200 + i * 240, 40, 40, '+1', () => {
                result.chance += 1;
            });
        }
    }
    textSize(16);
    drawButton(600, 70 + editor.workingRecipe.results.length * 240, 340, 30, 'ADD', () => {
        editor.workingRecipe.results = [...editor.workingRecipe.results, JSON.parse(JSON.stringify(editor.workingRecipe.results[editor.workingRecipe.results.length - 1]))];
    });

    
    drawButton(300, 300, 100, 30, 'TIME', () => {
        editor.workingRecipe.time = 60;
        editor.workingRecipe.actor = undefined;
        editor.workingRecipe.actorValue = undefined;
    });
    drawButton(300, 330, 100, 30, 'ACTOR', () => {
        editor.workingRecipe.time = 0;
        editor.workingRecipe.actor = {conditions: [{ type: 'Is', data: editor.actorItem }]};
    });

    let i = 0;
    for (const type of ['~', '=', '<', '>', '<=', '>=']) {
        drawButton(100, 300 + i * 40, 30, 30, type, () => {
            if (i === 0) {
                editor.workingRecipe.originValue = undefined; 
                return;
            } else {
                editor.workingRecipe.originValue = { op: type, ref: 0 };
            }
        });
        if (editor.workingRecipe.actor) {
            drawButton(300, 400 + i * 40, 30, 30, type, () => {
                if (i === 0) {
                    editor.workingRecipe.actorValue = undefined; 
                    return;
                } else {
                    editor.workingRecipe.actorValue = { op: type, ref: 0 };
                }
            })
        }
        i += 1;
    }

    fill(255);
    textFont(Fonts.bold);
    textSize(16);
    textAlign(LEFT, TOP);
    
    if (editor.workingRecipe.originValue) {
        text(editor.workingRecipe.originValue.op + ' ' + editor.workingRecipe.originValue.ref, 150, 300);
        drawButton(150, 350, 30, 30, '-1', () => {
            editor.workingRecipe.originValue.ref -= 1;
        });
        drawButton(190, 350, 30, 30, '+1', () => {
            editor.workingRecipe.originValue.ref += 1;
        });
        drawButton(150, 390, 30, 30, '-10', () => {
            editor.workingRecipe.originValue.ref -= 10;
        });
        drawButton(190, 390, 30, 30, '+10', () => {
            editor.workingRecipe.originValue.ref += 10;
        });
    }

    textAlign(LEFT, TOP);
    if (editor.workingRecipe.actorValue) {
        text(editor.workingRecipe.actorValue.op + ' ' + editor.workingRecipe.actorValue.ref, 350, 400);
        drawButton(350, 450, 30, 30, '-1', () => {
            editor.workingRecipe.actorValue.ref -= 1;
        });
        drawButton(390, 450, 30, 30, '+1', () => {
            editor.workingRecipe.actorValue.ref += 1;
        });
        drawButton(350, 490, 30, 30, '-10', () => {
            editor.workingRecipe.actorValue.ref -= 10;
        });
        drawButton(390, 490, 30, 30, '+10', () => {
            editor.workingRecipe.actorValue.ref += 10;
        });
    }

    drawButton(100, 600, 200, 40, 'COPY TO CLIPBOARD', () => {
        navigator.clipboard.writeText(JSON.stringify(editor.workingRecipe));
    })

    textAlign(LEFT, TOP);
    text('ORIGIN', width - 720, height - 60);
    text('ACTOR', width - 545, height - 60);
}



function drawTreePage() {

    translate(width / 2 + editor.offX, height / 2 - 200 + editor.offY);
    if (input.mouse[LEFT] >= 1) {
        editor.targetX += mouseX - pmouseX;
        editor.targetY += mouseY - pmouseY;
    }
    editor.offX = lerp(editor.offX, editor.targetX, 0.5);
    editor.offY = lerp(editor.offY, editor.targetY, 0.5);


    function treeWidth(id, depth = 0) {
        if (id === 0 || depth > 10) {
            return 1;
        }
        const item = REGISTRY.getItem(id);
        if (item.tags.includes('root') || item.tags.includes('natural')) {
            return 1;
        }
        if (item.resultedBy.length === 0) {
            return 1;
        }
        const recipe = item.resultedBy[0];
        if (recipe.getAnActor() === 0) {
            return 1;
        }
        return treeWidth(recipe.getAnOrigin(), depth + 1) + treeWidth(recipe.getAnActor(), depth + 1) + 1;
    }

    function drawTree(id, x, y, time = 0, depth = 0) {
        noFill();
        stroke(255);
        rect(x - 10, y - 10, 20, 20);
        noStroke();
        if (id === -1) {
            const dispTime = time > 86400 ? floor(time / 86400) + 'd' : time > 3600 ? floor(time / 3600) + 'h' : time > 60 ? floor(time / 60) + 'm' : time + 's';
            fill(255);
            textAlign(CENTER, CENTER);
            textFont(Fonts.bold);
            textSize(8);
            text(dispTime, x, y);
            return;
        }
        const item = REGISTRY.getItem(id);
        textSize(16);
        textAlign(LEFT, TOP);
        drawItem(item.display, x - 8, y - 8);
        textSize(8);
        textAlign(CENTER, BOTTOM);
        textFont(Fonts.regular)
        fill(255);
        text(item.name, x, y - 12);
        if (depth > 10 || item.resultedBy.length === 0 || item.tags.includes('root') || item.tags.includes('natural')) {
            return;
        }

        noFill();
        stroke(255);
        line(x, y + 10, x, y + 30);
        line(x - 5, y + 15, x, y + 10);
        line(x + 5, y + 15, x, y + 10);
        
        const origin = item.resultedBy[0].getAnOrigin();
        const actor = item.resultedBy[0].getAnActor();
        const isTimed = item.resultedBy[0].time > 0;
        if (actor === 0 && !isTimed) {
            line(x, y + 30, x, y + 60);
            drawTree(origin, x, y + 60, 0, depth + 1);
            return;
        }
        
        const leftWidth = treeWidth(origin);
        const rightWidth = isTimed ? 1 : treeWidth(actor, depth);
        const leftX = x - leftWidth * 20;
        const rightX = x + rightWidth * 20;
        line(x, y + 30, leftX, y + 30);
        line(leftX, y + 30, leftX, y + 40);
        line(x, y + 30, rightX, y + 30);
        line(rightX, y + 30, rightX, y + 40);
        drawTree(origin, leftX, y + 60, 0, depth + 1);
        if (!isTimed) {
            drawTree(actor, rightX, y + 60, 0, depth + 1);
        } else {
            drawTree(-1, rightX, y + 60, item.resultedBy[0].time, depth + 1);
        }
    }

    drawTree(editor.selectedItem, 0, 0);
}

function drawEditor() {
    background(0);
    textFont(Fonts.bold);
    textSize(16);
    fill(255);
    noStroke();
    textAlign(LEFT, TOP);
    text('EDITOR', 4, 4);
    
    drawButton(0, 32, 64, 32, 'ITEMS', () => {
        editor.workingRecipe = null;
        editor.workingItem = null;
        editor.selectedItem = 0;
        editor.actorItem = 0;
        editor.actorResultItem = 0;
        editor.originResultItem = 0;
        editor.tab = 'items';
        localStorage.setItem('tab', 'items');
    });
    const goToRecipes = () => {
        editor.tab = 'recipes';
        editor.workingRecipe = null;
        editor.workingItem = null;
    };
    if (input.keys['R'.charCodeAt(0)] === 1 && document.activeElement.tagName !== 'INPUT') {
        goToRecipes();
    }
    drawButton(64, 32, 128, 32, 'RECIPES', goToRecipes);
    if (editor.tab === 'items') {
        drawItemsPage();
    } else if (editor.tab === 'recipes') {
        drawRecipesPage();
    } else if (editor.tab === 'tree') {
        drawTreePage();
    }
}