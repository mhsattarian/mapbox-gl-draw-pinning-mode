import { geojsonTypes, events } from "@mapbox/mapbox-gl-draw/src/constants";

import doubleClickZoom from "@mapbox/mapbox-gl-draw/src/lib/double_click_zoom";
import SimpleSelect from "@mapbox/mapbox-gl-draw/src/modes/simple_select";

import bboxPolygon from "@turf/bbox-polygon";
import { coordAll } from "@turf/meta";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";

const {
  // onClick: originalOnClick,
  onMouseDown: originalOnMouseDown,
  onMouseUp: originalOnMouseUp,
  onDrag: originalOnDrag,
  // toDisplayFeatures: originalToDisplayFeatures,
  fireUpdate: originalFireUpdate,
  clickAnywhere: originalClickAnywhere,
  ...restOriginalMethods
} = SimpleSelect;

const pinMode = {
  // originalOnClick,
  originalOnMouseDown,
  originalOnMouseUp,
  originalOnDrag,
  // originalToDisplayFeatures,
  originalFireUpdate,
  originalClickAnywhere,
  ...restOriginalMethods,
};

pinMode.onSetup = function () {
  const selectedFeatures = this.getSelected();
  this.clearSelectedFeatures();
  doubleClickZoom.disable(this);

  const state = {
    map: this.map,
    draw: this._ctx.api,
    selectedFeatures,
    selectedPointID: null,
  };

  const getFeaturesVertices = () => {
    const BBoxPolygon = (() => {
      const map = state.map;
      const canvas = map.getCanvas(),
        w = canvas.width,
        h = canvas.height,
        cUL = map.unproject([0, 0]).toArray(),
        cUR = map.unproject([w, 0]).toArray(),
        cLR = map.unproject([w, h]).toArray(),
        cLL = map.unproject([0, h]).toArray();

      return bboxPolygon([cLL, cUR].flat());
    })();

    const vertices = [];
    const features = state.draw.getAll();
    features.features = features.features.filter((feature) => {
      return coordAll(feature).some((coord, idx) =>
        booleanPointInPolygon(coord, BBoxPolygon)
      );
    });

    const _this = this;
    features.features.forEach((feature) => {
      const featureVertices = coordAll(feature);
      featureVertices.forEach(
        ((featureVertex, vIdx) => {
          const alreadyDrawnIdx = vertices.findIndex((v) => {
            const c = v.vertex.coordinates;
            return c[0] === featureVertex[0] && c[1] === featureVertex[1];
          });

          if (alreadyDrawnIdx !== -1) {
            vertices[alreadyDrawnIdx].vertex.properties.featureIds.push([
              feature.id,
              vIdx,
            ]);
          } else {
            vertices.push({
              vertex: this.newFeature({
                type: geojsonTypes.FEATURE,
                properties: {
                  featureIds: [[feature.id, vIdx]],
                },
                id: feature.id + "-" + vIdx,
                geometry: {
                  type: geojsonTypes.POINT,
                  coordinates: featureVertex,
                },
              }),
            });
          }
        }).bind(_this)
      );
    });

    vertices.forEach(
      ((vertex) => {
        return this.addFeature(vertex.vertex);
      }).bind(this)
    );

    state.features = features;
    state.vertices = vertices;
    state.points = vertices;
  };

  getFeaturesVertices();

  // for removing listener later on close
  state["moveendCallback"] = getFeaturesVertices;
  this.map.on("moveend", getFeaturesVertices);

  return state;
};

pinMode.fireUpdate = function (newF) {
  this.map.fire(events.UPDATE, {
    action: 'Pinning',
    features: newF
});
};

pinMode.onMouseDown = function (state, e) {
  if (e.featureTarget) {
    state.selectedPointID = e.featureTarget.properties.id;
  }
  this.originalOnMouseDown.call(this, state, e);
};

pinMode.update = function (state, e) {
  if (!state.selectedPointID) return;
  const movingPoint = this.getSelected()[0];
  let newFeatures = []
  movingPoint.properties.featureIds.forEach(([id, vIdx]) => {
    const f = state.draw.get(id);
    f.geometry.coordinates[0][vIdx] = movingPoint.coordinates;
    newFeatures.push(f)
    state.draw.add(f);
  });
  this.fireUpdate(newFeatures)
};

pinMode.onMouseUp = function (state, e) {
  state.selectedPointID = null;
  this.update(state, e);
  this.originalOnMouseUp.call(this, state, e);
};

pinMode.onDrag = function (state, e) {
  this.originalOnDrag.call(this, state, e);
  this.update(state, e);
};

// This is extending simpleSelec.clickAnywhere
pinMode.clickAnywhere = function (state) {
  this.onStop(state);
  this.originalClickAnywhere(state);
};

pinMode.onStop = function (state) {
  // Remove moveemd callback
  this.map.off("moveend", state.moveendCallback);

  // Remove helping features added for this mode
  this.deleteFeature(
    state.vertices.map(({ vertex }) => vertex.id),
    {
      silent: true,
    }
  );
  doubleClickZoom.enable(this);
};

export default pinMode;
