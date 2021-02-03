
// Import Modules
import { SpheresSheet } from "./config.js";

import { ItemPF } from "../../../systems/pf1/module/item/entity.js";
import { ActorSheetPF } from "../../../systems/pf1/module/actor/sheets/base.js";
import { ItemSheetPF } from "../../../systems/pf1/module/item/sheets/base.js";
import { ActorSheetPFCharacter } from "../../../systems/pf1/module/actor/sheets/character.js";
import { ActorSheetPFNPC } from "../../../systems/pf1/module/actor/sheets/npc.js";
import {
  convertWeight
} from "../../../systems/pf1/module/lib.js";

function injectIntoClass(classObj, functionName, prior, injection) {
  console.log(`SpheresSheet | Injecting into ${classObj.name}.${functionName}`);
  var funcText = classObj.prototype[functionName].toString();
  var insertionPoint = funcText.indexOf(prior) + prior.length;
  if (insertionPoint == -1) {
    console.log('SpheresSheet | Failed injection due to not finding prior');
    return;
  }
  var modifiedFunction = funcText.slice(0, insertionPoint) + injection + funcText.slice(insertionPoint);
  classObj.prototype[functionName] = eval('(function ' + modifiedFunction + ')');
}

Hooks.once('init', async function() { 
  console.log('spheres-sheet | Initializing spheres sheet');

  CONFIG.SpheresSheet = SpheresSheet;

  // // Add talent feat type
  CONFIG.PF1.featTypes['combatTalent'] = "SpheresSheet.FeatTypeCombatTalent";

  // Inject talents category into feats
  injectIntoClass(ActorSheetPF, '_prepareItems', '"feat-type": "classFeat" },\n      },',
    `\n      combatTalent: {
        label: game.i18n.localize("SpheresSheet.CombatTalentPlural"),
        items: [],
        canCreate: true,
        hasActions: true,
        dataset: { type: "feat", "type-name": game.i18n.localize("SpheresSheet.FeatTypeCombatTalent"), "feat-type": "combatTalent" },
      },`);

  injectIntoClass(ItemSheetPF, '_getItemProperties', 'props.push(labels.featType);\n',
    `      if ( item.data.featType == "combatTalent" && this.object.getFlag("spheres-sheet", "sphere")) {
        props.push(game.i18n.localize(this.object.getFlag("spheres-sheet", "sphere")));
      }\n`);

  hookRenderers();
});

function hookRenderers() {
  Hooks.on('renderActorSheet', (characterSheet, html, data) => {
    console.log('spheres-sheet | Inserting spheres column');
    const sphereHeader = $(`<div class="item-detail item-sphere"><span>${game.i18n.localize('SpheresSheet.Sphere')}</span></div>`);

    var featsGroups = html.find('.feats-group.flexcol');
    var wantedName = game.i18n.localize("SpheresSheet.CombatTalentPlural");
    for (var i = 0; i < featsGroups.length; i++) {
        if ($(featsGroups[i]).find('li.inventory-header h3').text() == wantedName) {
          var combatTalentsGroup = $(featsGroups[i]);
          combatTalentsGroup.find('li.inventory-header h3').after(sphereHeader);

          combatTalentsGroup.find('li.item').each((index, element) => {
            var talentId = $(element).data('item-id');
            var sphere = characterSheet.object.items.get(talentId).getFlag('spheres-sheet', 'sphere');
            if (!sphere) sphere = '';
            var sphereCol = $('<div class="item-detail item-sphere"><span>' + game.i18n.localize(sphere) + '</span></div>')
            $(element).find('div.item-name').after(sphereCol);
          });
        }
    }
  });

  Hooks.on('renderItemSheetPF', (itemSheet, html, data) => {
    if (itemSheet.object.data.data.featType === 'combatTalent') {
      var sphere = itemSheet.object.getFlag('spheres-sheet', 'sphere');
      if (!sphere) sphere = CONFIG.SpheresSheet.combatSpheres.equipment;
      const sphereDropdown = $(`<div class="form-group">
        <label>${game.i18n.localize('SpheresSheet.Sphere')}</label>
        <select name="data.sphere">
          ${Object.values(CONFIG.SpheresSheet.combatSpheres)
            .map(element => `<option value="${element}"${element == sphere ? ' selected' : ''}>${game.i18n.localize(element)}</option>`).join('\n')}
        </select>
      </div>`);
      html.find('div.tab.details > div:nth-child(2)').after(sphereDropdown);
    }
  });

  Hooks.on('updateOwnedItem', (actorSheet, item, change, diff, _id) => {
    if ('data' in change && 'sphere' in change.data) {
      actorSheet.items.get(change._id).setFlag('spheres-sheet', 'sphere', change.data.sphere);
    }
  });

  Hooks.on('updateItem', (item, change, diff, _id) => {
    if ('data' in change && 'sphere' in change.data) {
      item.setFlag('spheres-sheet', 'sphere', change.data.sphere);
    }
  });
}