import $ from 'jquery';
import on from 'dojo/on';
import Helper from 'babel/utils/helper/Helper';
import Logger from 'babel/utils/logging/Logger';
import domContruct from 'dojo/dom-construct';
import {getIcon} from 'babel/utils/helper/icons/IconGenerator';
import WebmapController from 'babel/components/map/WebmapController';
import ClusterFeatureLayer from 'lib/cluster-layer-js/src/clusterfeaturelayer';
// TODO Move actions out at a prop
import MapActions from 'babel/actions/MapActions';
import AppActions from 'babel/actions/AppActions';
import ItemActions from 'babel/actions/ItemActions';
import componentNames from 'babel/constants/componentNames/ComponentNames';
import viewerText from 'i18n!translations/viewer/nls/template';
import builderText from 'mode!isBuilder?i18n!translations/builder/nls/template';
import { _getUrlVar } from 'babel/utils/url/urlhelper';

const _logger = new Logger({
  source: 'Crowdsource Webmap Controller'
});

const _onError = function onError(err) {
  _logger.logMessage({
    type: 'error',
    error: err
  });
};

export const CrowdsourceWebmapController = class CrowdsourceWebmapController extends WebmapController {

  constructor(options) {
    super(options);

    // Autobind methods
    this.isHomeExtentChanged = this.isHomeExtentChanged.bind(this);
    this.saveHomeExtent = this.saveHomeExtent.bind(this);
  }

  updateMap(options) {
    super.updateMap(options);

    if (this._map && this._map.setClusterLayerQueryWhere && this.crowdsourceLayerWhere !== this._settings.crowdsourceLayer.where) {
      this.crowdsourceLayerWhere = this._settings.crowdsourceLayer.where;
      this._map.setClusterLayerQueryWhere(this.crowdsourceLayerWhere);
    }
  }

  onMapLoad() {
    super.onMapLoad();
    this.createClusterLayer();

    if (_getUrlVar('report')) {
      MapActions.selectFeature(+_getUrlVar('report'));
    }

    if (this._settings.homeButton && this._settings.editable) {
      this._homeSettings = {
        center: this._map.extent.getCenter(),
        zoom: this._map.getLevel()
      };
      this._homeButton.extent = this._map.extent;
      this._saveHomeExtentButton = domContruct.create('div',{
        'title': builderText.map.editControls.homeLocation.tooltip,
        'class': 'home-location-save-btn btn btn-default',
        'innerHTML': '<div tabindex="0">' + getIcon('save') + '</div>'
      },document.querySelector('.esriSimpleSlider .home-button'),'after');
      this._map.on('extent-change',() => {
        if (this.isHomeExtentChanged()) {
          $('.home-location-save-btn').addClass('location-changed');
        } else {
          $('.home-location-save-btn').removeClass('location-changed');
        }
      });
      $('.home-location-save-btn').on('click',this.saveHomeExtent);

    }
  }

  saveHomeExtent() {
    if (this.isHomeExtentChanged()) {
      const extent = Helper.mapUtils.serializeExtentToItem({
        extent: this._map.extent,
        type: 'string'
      });

      ItemActions.updateWebmapItem({
        extent
      });
      ItemActions.updateAppItem({
        extent
      });
      this._homeSettings = {
        center: this._map.extent.getCenter(),
        zoom: this._map.getLevel()
      };
      this._homeButton.extent = this._map.extent;
      $('.home-location-save-btn').removeClass('location-changed');
    }
  }

  isHomeExtentChanged() {
    const centerMoved = function() {
      const changeTolerance = 25;
      const resolutionWidth = this._map.extent.getWidth() / this._map.width;
      const resolutionHeight = this._map.extent.getHeight() / this._map.height;
      const homeCenter = this._homeSettings.center;
      const newCenter = this._map.extent.getCenter();
      const differenceWidth = Math.abs(homeCenter.x - newCenter.x);
      const differenceHeight = Math.abs(homeCenter.y - newCenter.y);

      if (differenceWidth / resolutionWidth >= changeTolerance || differenceHeight / resolutionHeight >= changeTolerance) {
        return true;
      } else {
        return false;
      }
    };

    if (this._homeSettings && this._homeSettings.zoom !== this._map.getLevel()) {
      return true;
    } else if (this._homeSettings && this._homeSettings.zoom === this._map.getLevel() && centerMoved.call(this)) {
      return true;
    } else {
      return false;
    }
  }

  createClusterLayer() {
    const map = this._map;

    if (this._settings.crowdsourceLayer && this._settings.crowdsourceLayer.id && map.getLayer(this._settings.crowdsourceLayer.id)) {
      const layer = map.getLayer(this._settings.crowdsourceLayer.id);
      const url = layer ? layer.url : null;
      const objectIdField = layer.objectIdField;

      if (url) {
        const clusterDefaults = {
          objectIdField,
          disablePopup: true,
          distance: 80,
          id: 'crowdsourceClusters',
          queryAttachments: true,
          labelColor: '#fff',
          resolution: map.extent.getWidth() / map.width,
          where: this._settings.crowdsourceLayer.where,
          url,
          filterFeaturesOnResponse: this._settings.editable ? false : (features) => {
            const newFeatures = ([].concat(features)).reduce((prev, current) => {

              const containsAttachments = () => {
                if (current.attachmentInfos && current.attachmentInfos.length >= 2) {
                  const thumbnail = current.attachmentInfos.filter((attachment) => {
                    if (attachment.name.search('PrimaryThumbnail') === 0) {
                      return true;
                    } else if (attachment.name.search('thumbnail.png') === 0) {
                      return true;
                    }
                    return false;
                  })[0];
                  const photo = current.attachmentInfos.filter((attachment) => {
                    if (attachment.name.search('PrimaryPhoto') === 0) {
                      return true;
                    } else if (attachment.name.search('optimized.png') === 0) {
                      return true;
                    }
                    return false;
                  })[0];

                  if (thumbnail && photo) {
                    return true;
                  }
                }
                return false;
              };

              if (containsAttachments()) {
                return prev.concat(current);
              }

              return prev;
            },[]);

            return newFeatures;
          }

        };
        const clusterOptions = $.extend(true, {}, clusterDefaults, this._settings.crowdsourceLayer.clusterOptions);
        const clusterLayer = new ClusterFeatureLayer(clusterOptions);

        window.cl = clusterLayer;

        if (layer) {
          MapActions.updateMapReferences({
            itemInfo: this._itemInfo,
            map,
            layer,
            clusterLayer
          });
        }

        on.once(clusterLayer,'ids-returned',(e) => {
          if (e.results.length === 0){
            this.onLoad();
          }
        });

        on.once(clusterLayer,'clusters-shown', () => {
          this.onLoad();
        });

        on(clusterLayer,'ids-returned',(e) => {
          if (e.results.length === 0){
            const features = clusterLayer._inExtent();

            MapActions.updateFeaturesInExtent(features);
          }
        });

        // Map ready when cluster are first shown
        clusterLayer.on('clusters-shown', () => {
          // Get original features in current extent
          const features = clusterLayer._inExtent();

          MapActions.updateFeaturesInExtent(features);
        });

        clusterLayer.on('singles-click', (e) => {
          const ids = [].concat(e.singles).reduce((prev,current) => {
            return prev.concat(current.attributes[layer.objectIdField]);
          },[]);

          MapActions.selectFeature(ids[0]);
        });

        map.on('click', () => {
          MapActions.selectFeature(false);
        });

        map.on('pan-start',() => {
          MapActions.mapMoving(true);
        });

        map.on('zoom-start',() => {
          MapActions.mapMoving(true);
        });

        map.on('extent-change',() => {
          MapActions.mapMoving(false);
        });

        if (!this._settings.isMobile) {
          clusterLayer.on('mouse-over',(e) => {
            map.setMapCursor('pointer');
            if (e.graphic && e.graphic.attributes.clusterCount && e.graphic.attributes.clusterCount === 1) {
              const clusterId = e.graphic.attributes.clusterId;
              const features = clusterLayer._inExtent();
              const feature = features.filter((current) => {
                return current.attributes.clusterId === clusterId;
              })[0];

              if (feature) {
                MapActions.highlightFeature(feature.attributes[layer.objectIdField]);
              }
            }
          });

          clusterLayer.on('mouse-out',() => {
            map.setMapCursor('default');
            MapActions.highlightFeature(false);
          });
        }

        // Hide original layer
        layer.hide();

        // Add cluster layer
        map.addLayer(clusterLayer);

        // Create cluster layer refresh method in Map
        map.refreshCrowdsourceLayer = function () {
          clusterLayer._visitedExtent = null;
          clusterLayer.updateClusters();
        };

        map.setClusterLayerQueryWhere = function (where) {
          clusterLayer._where = where || '1=1';
          MapActions.updateFeaturesInExtent([]);
          map.refreshCrowdsourceLayer();
        };

      } else if (layer)  {
        _onError('Layer ' + this._settings.crowdsourceLayer.id + ' does not exist in map.');
      }
    } else if (window.app.mode.fromScratch) {
      this.onLoad();
    } else {
      _onError('Crowdsource layer not found. Check layer ID and make sure you have permission to access the feature layer.');
      AppActions.displayMainError(viewerText.errors.loading.crowdsourceLayerNotFound);
    }
  }

  onLoad() {
    if (!this.loaded) {
      this.loaded = true;
      this.emit('load');
      AppActions.componentLoaded(componentNames.MAP);
    }
  }

};

export default CrowdsourceWebmapController;
