// I apologize for this mess.

var colorRepresentations = [
    Color.blue, Color.red, Color.green, Color.white,
    Color.cyan, Color.magenta, Color.yellow, Color.black,
    Color.sky, Color.pink, Color.olive, Color.lightGray
]

var colorIcons = colorRepresentations.map(function (color) {
    var pixmap = new Pixmap(24, 24);
    pixmap.setColor(color)
    pixmap.fill()
    return TextureRegionDrawable(TextureRegion(Texture(pixmap)))
})



var entities = {};
var colors;
var registryVersion;
function newRegistry() {
    colors = new Array(12);
    registryVersion = Time.time();
    for (var i = 0; i < 12; i++) {
        colors[i] = {ids: [], offset: 0};
    }
}
function registerColor(entity) {
    if (entity.colorCode() == -1) return
    colors[entity.colorCode()].ids.push(entity.id())
}
function unregisterColor(entity) {
    if (entity.colorCode() == -1) return
    var index = colors[entity.colorCode()].ids.indexOf(entity.id())
    if (index === -1) return;
    colors[entity.colorCode()].ids.splice(index, 1)
}
function gameReloadDetected() {
    if (registryVersion + 100 < Time.time()) {
        newRegistry()
    }
}

newRegistry()







var lastColor = -1
function entity(a) {
    var entity = a.ent()
    
    if (entities[entity.id] == undefined) {
        var initialized = false;
        var offset = 0;
        var registry = -1;
        var initialized = false
        entities[entity.id] = {
            realEntity: entity,
            
            init() {
                if (!initialized) {
                    initialized = true
                    registerColor(this)
                }
            },
            id() {return entity.id},
            tryToOutput(item, forReal) {
                var proximity = entity.proximity();
                for (var i = 0; i < proximity.size; i++) {
                    var target = proximity.get((offset + i) % proximity.size)
                    
                    if (!target.block().instantTransfer && target.block().acceptItem(item, target, entity.tile)) {
                        if (forReal) {
                            target.block().handleItem(item, target, entity.tile);
                            offset += i + 1
                        }
                        return true
                    }
                }
                return false
            },
            
            removed() {
                unregisterColor(this);
            },


            colorCode(colorCode) {
                if (colorCode === undefined) {
                    return entity.link
                } else {
                    unregisterColor(this)
                    entity.link = colorCode
                    registerColor(this)
                    lastColor = colorCode
                }
            },
            
            update() {
                if (!initialized) {
                    gameReloadDetected();
                    this.init()
                }
            }
        }
    }
    return entities[entity.id]
}
function entityFromId (id) {
    return entities[id]
}






function Block__tryToOutput(item, myTile, forReal) {
    if (entity(myTile).colorCode() === -1) return false;
    var color = colors[entity(myTile).colorCode()]
    var length = color.ids.length;
    for (var i = 0; i < length; i++) {
        var teleporter = entityFromId(color.ids[(i + color.offset) % length]);
        
        if (teleporter.tryToOutput(item, forReal)) {
            if (forReal) {
                color.offset = i + color.offset + 1;
            }
            return true;
        }
    }
    return false;
}
var superInstance = new Block('teleporter-super')
const teleporter = extendContent(Block, "teleporter", {
    outputsItems: () => true,

    acceptItem(item, myTile, srcTile) {
        return Block__tryToOutput(item, myTile, false);
    },
    
    handleItem(item, myTile, srcTile) {
        return Block__tryToOutput(item, myTile, true);
    },
    
    playerPlaced(tile) {
        entity(tile).init()
        tile.configure(lastColor)
    },
    
    placed(tile) {
        entity(tile).init()
    },
    
    removed(tile) {
        entity(tile).removed()
    },
    
    update(tile) {
        entity(tile).update()
    },
    configured (tile, player, value){
        entity(tile).colorCode(value)
        
        print (entity(tile).colorCode())
    },
    
    buildConfiguration(tile, table) {
        var group = new ButtonGroup()
        group.setMinCheckCount(0);
        var cont = new Table();
        cont.defaults().size(38);
        
        for(var i = 0; i < 12; i++){
            (function (i, tile) {
                var button = cont.addImageButton(Tex.whiteui, Styles.clearToggleTransi, 24, run(() => Vars.control.input.frag.config.hideConfig())).group(group).get();
                button.changed(run(() => tile.configure((button.isChecked() ? i : -1))));
                button.getStyle().imageUp = colorIcons[i];
                button.update(run(() => button.setChecked(entity(tile).colorCode() == i)));
            })(i, tile)
            if(i % 4 == 3){
                cont.row();
            }
        }

        table.add(cont);
    },
    drawRequestConfig(req, list) {
        if (req.config === -1) return
        Draw.color(colorRepresentations[req.config])
        Draw.rect("center", req.drawx(), req.drawy(), 5, 5);
        Draw.color()
    },
    draw(tile) {
        superInstance.draw(tile)
        if (entity(tile).colorCode() == -1) return
        Draw.color(colorRepresentations[entity(tile).colorCode()]);
        Draw.rect("center", tile.worldx(), tile.worldy(), 5, 5);
        Draw.color();
    }
})

var a = new ItemBridge('nothing')

teleporter.entityType = new Prov({
    get: ()=>a.newEntity()
})

teleporter.name = "Teleporter"
teleporter.description = "Advanced item transport block. Teleporters input items to other teleporters of the same color. Does nothing if no teleporters of the same color exist. If multiple teleporters exist of the same color, items are distributed evenly. Tap to change color."


