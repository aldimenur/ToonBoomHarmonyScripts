// Author: Dima Potekhin (skinion.onn@gmail.com)
// Version: 0.220615

//
function getAttributes(attribute, attributeList) {
    attributeList.push(attribute);
    var subAttrList = attribute.getSubAttributes();
    for (var j = 0; j < subAttrList.length; ++j) {
        if (typeof(subAttrList[j].keyword()) === 'undefined' || subAttrList[j].keyword().length == 0)
            continue;
        getAttributes(subAttrList[j], attributeList);
    }
}


//
function getFullAttributeList(nodePath) {
    var attributeList = [];
    var topAttributeList = node.getAttrList(nodePath, 1);
    for (var i = 0; i < topAttributeList.length; ++i) {
        getAttributes(topAttributeList[i], attributeList);
    }
    return attributeList;
}


//
function unlinkFunctions(_node, _columnTypes, _invertColumnTypes, keepCurrentValues) {

    var nodeNamePath = _node.split("/");
    var nodeName = nodeNamePath[nodeNamePath.length - 1];
    // MessageLog.trace(i+") "+nodeName+", "+nodeNamePath  );

    MessageLog.trace("NODE: " + i + ") " + nodeName + ", [" + node.type(_node) + "]");

    var attrs = getFullAttributeList(_node);
    var isPositionSeparate = node.getTextAttr(_node, 1, 'POSITION.SEPARATE') === 'Y'; //
    var isEnabled3d = node.getTextAttr(_node, 1, 'ENABLE_3D') === 'Y'; //
    var isRotationSeparate = node.getTextAttr(_node, 1, 'ROTATION.SEPARATE') === 'On'; // On = Euler; Off = Quaternion
    // MessageLog.trace("isEnabled3d: "+isEnabled3d);
    // MessageLog.trace("isRotationSeparate: "+isRotationSeparate);

    try {

        attrs.forEach(function(attr) {

            var attrFullName = attr.fullKeyword();
            // MessageLog.trace("ATTR: " + attrFullName+' > '+ node.getTextAttr(_node, 1, attrFullName ) );

            var linkedColumn = node.linkedColumn(_node, attrFullName);
            if (!linkedColumn) return;

            var columnType = column.type(linkedColumn);
            // if (columnType !==E 'QUATERNIONPATH') return; // !!!

            if (_columnTypes) {

                if (_invertColumnTypes) { // Skip provided column types

                    if (_columnTypes.indexOf(columnType) !== -1) {
                        MessageLog.trace('Skipped');
                        return;
                    }

                } else { // Skip all except provided column types

                    if (_columnTypes.indexOf(columnType) === -1) {
                        return;
                        MessageLog.trace('Skipped');
                    }

                }

            }

            // if ( linkedColumn && attrFullName != "DRAWING.ELEMENT" ){
            // MessageLog.trace("-   UNLINK: " + attr.name() + " (" + attrFullName + ")" + " <" + attr.typeName());

            if (isEnabled3d) { // 3d mode enabled

                if (isRotationSeparate) { // Euler
                    if (columnType === 'QUATERNIONPATH') return;

                } else { // Quaternion
                    if (attrFullName.indexOf('ROTATION.ANGLE') !== -1) return;

                }

            }

            var currentValue = column.getEntry(linkedColumn, 0, frame.current());

            switch (columnType) {

                case 'QUATERNIONPATH':

                    currentValue = attr.pos3dValueAt(frame.current());
                    break;

            }
            // MessageLog.trace('--> columnType: "' + columnType + '", ' + attr.name() + " (" + attrFullName + ")" + " <" + attr.typeName() + ">");

            node.unlinkAttr(_node, attrFullName);

            if (keepCurrentValues) {

                switch (columnType) {

                    case 'QUATERNIONPATH':
                        node.getAttr(_node, frame.current(), 'ROTATION.ANGLEX').setValue(currentValue.x);
                        node.getAttr(_node, frame.current(), 'ROTATION.ANGLEY').setValue(currentValue.y);
                        node.getAttr(_node, frame.current(), 'ROTATION.ANGLEZ').setValue(currentValue.z);
                        break;

                    default:
                        // MessageLog.trace("-   VALUE: " + currentValue);
                        if (numberTypes.indexOf(typeof attr.typeName()) === -1) currentValue = parseFloat(currentValue);
                        // MessageLog.trace('Apply EColumn Value: ' + currentValue + ' > ' + typeof currentValue);
                        attr.setValue(currentValue);
                }


            }

        });

    } catch (err) { MessageLog.trace('ERR:' + err) }

}




var numberTypes = ['DOUBLEVB', 'DOUBLE', 'INT'];

//
function getAttributeValue(attr) {
    switch (attr.typeName()) {
        case 'DOUBLE':
        case 'DOUBLEVB':
            return attr.doubleValue();
        case 'INT':
            return attr.intValue();
        case 'STRING':
            return attr.textValue()
    }
}

//
function getUnusedName(_node, nameOnly) {

    if (!node.type(_node)) return nameOnly ? _node.split('/').pop() : _node;

    var _newName;
    var renameTries = 0;
    var nameIsUnused = false;

    do { // Rename until success omitting existing names
        renameTries++;
        _newName = _node + '_' + renameTries;
        if (!node.type(_newName)) nameIsUnused = true;

    } while (!nameIsUnused && renameTries < 200)

    if (!nameIsUnused) return;
    return nameOnly ? _newName.split('/').pop() : _newName;

}


//
function getValidNodeName(nodeName) {
    return nodeName ? nodeName.replace(/\s/gi, '_').replace(/[^a-zA-Z0-9_-]+/gi, '') : undefined;
}


//
function getNodeParent(_node) {
    if (!_node) return;
    var parentNode = _node.match(/(.*)\//);
    return (parentNode && parentNode[1]) ? parentNode[1] : undefined;
}


//
function getNodesBounds(_nodes) {

    var bounds = {
        x: {
            left: 9999999,
            right: -9999999,
        },
        y: {
            bottom: -9999999,
            top: 999999
        }
    };

    _nodes.forEach(function(_node) {
        var x = node.coordX(_node);
        var y = node.coordY(_node);
        var w = node.width(_node);
        var wh = w / 2;
        var h = node.height(_node);
        var hh = h / 2;
        if (bounds.x.right < x) bounds.x.right = x;
        if (bounds.x.left > x) bounds.x.left = x;
        if (bounds.y.top > y) bounds.y.top = y;
        if (bounds.y.bottom < y) bounds.y.bottom = y;
    });

    bounds.width = bounds.x.right - bounds.x.left;
    bounds.x.center = bounds.x.left + (bounds.width) / 2;
    bounds.height = bounds.y.bottom - bounds.y.top;
    bounds.y.center = bounds.y.top + (bounds.height) / 2;

    return bounds;

}

//
//
function createNode(parentNode, name, type, x, y, src, dest) {
    var createdNode = node.add(parentNode, name, type, x, y, 0);
    if (src) node.link(src, 0, createdNode, 0);
    if (dest) {
        node.unlink(dest, 0);
        node.link(createdNode, 0, dest, 0);
    }
    // MessageLog.trace('?? '+dest);
    return createdNode;
}


//
function getOutputNodes(_node) {
    var numOutput = node.numberOfOutputPorts(_node);
    // MessageLog.trace('>>>>'+numOutput);
    var listOfDestinationNodes = [];
    for (var i = 0; i < numOutput; i++) {
        var numLinks = node.numberOfOutputLinks(_node, i);
        for (var j = 0; j < numLinks; j++) {
            listOfDestinationNodes.push(node.dstNode(_node, i, j));
        }
    }
    // MessageLog.trace('>>'+listOfDestinationNodes.join('\n'));
    return listOfDestinationNodes;
}

//
function getAllChildNodes(nodes, typeFilter) {

    if (typeof nodes === 'string') nodes = [nodes];

    var _nodes = [];
    var _typeFilter = new RegExp(typeFilter);

    function checkNode(_node) {

        if (!_node) return;
        // MessageLog.trace( _node, node.type(_node) );

        var nodeType = node.type(_node);

        if (nodeType === 'GROUP') {
            (node.subNodes(_node) || []).forEach(function(n) { checkNode(n) });
            return;
        }

        if (!_typeFilter || nodeType.match(_typeFilter)) {
            if (_nodes.indexOf(_node) === -1) _nodes.push(_node);
        }

        getOutputNodes(_node).forEach(function(n) { checkNode(n) });

    }

    nodes.forEach(function(_node) {

        checkNode(_node);

    });

    return _nodes;

}


//
function getLayerByDrawing(columnName, exposureName) {

    var columnElementId = column.getElementIdOfDrawing(columnName);
    // MessageLog.trace('getLayerByDrawing:' + columnName + ', ' + exposureName+', '+columnElementId );
    var layerFound, frameFound;

    var startFrame = scene.getStartFrame();
    var stopFrame = scene.getStopFrame();
    // MessageLog.trace(startFrame+' : '+stopFrame);

    node.getNodes(['READ']).every(function(nodeName, i) {

        var elementId = node.getElementId(nodeName);
        var elementName = element.getNameById(elementId);
        var elementPhysicalName = element.physicalName(elementId);
        var elementColumn = node.linkedColumn(nodeName, "DRAWING.ELEMENT");
        // MessageLog.trace(i + ') ' +elementId+' !== '+columnElementId);
        if (elementId !== columnElementId) return true;

        layerFound = nodeName;

        // Find the position on the Timeline
        var keyframes = getDrawingKeyframes(elementColumn, 0, true);
        keyframes.every(function(_frame) {
            // MessageLog.trace( column.getEntry( elementColumn, 1, _frame ) +' != '+ exposureName);
            if (column.getEntry(elementColumn, 1, _frame) != exposureName) return true;
            // MessageLog.trace('KEY is found');
            frameFound = _frame;
        });

        if (!frameFound) return true; // keep on searching while the key is not found

        // MessageLog.trace(i + ') ' + nodeName+', '+layerName+', '+elementId+', '+elementName+', '+elementPhysicalName  );
    });

    if (!layerFound) return;

    return {
        layerName: layerFound,
        frame: frameFound,
    };

}

//
function getDrawingKeyframes(columnName, startFrame, onlyUnique) {

    if (!startFrame) startFrame = 0;

    // MessageLog.trace('getDrawingKeyframes: '+columnName+', '+startFrame);

    var keyframes = [];
    var prevVal;

    for (var i = startFrame; i < frame.numberOf(); i++) {
        var val = column.getEntry(columnName, 1, i);
        if (!val) {
            prevVal = undefined;
            continue;
        }
        // MessageLog.trace(i+')) '+columnName+' => '+i +' > '+val);
        if (val != prevVal) {
            prevVal = val;
            // MessageLog.trace(i+'] '+keyframes.length +' >> '+keyframes[keyframes.length-1]+' > '+val);
            if (onlyUnique && keyframes.length && keyframes[keyframes.length - 1] == val) continue;
            keyframes.push(i);
        }
    }

    // MessageLog.trace( JSON.stringify(keyframes,true,'  ') );
    return keyframes;
}


///
exports = {
    getAttributes: getAttributes,
    getFullAttributeList: getFullAttributeList,
    unlinkFunctions: unlinkFunctions,
    getUnusedName: getUnusedName,
    getValidNodeName: getValidNodeName,
    getNodesBounds: getNodesBounds,
    getNodeParent: getNodeParent,
    createNode: createNode,
    getOutputNodes: getOutputNodes,
    getAllChildNodes: getAllChildNodes,
    getLayerByDrawing: getLayerByDrawing,
}