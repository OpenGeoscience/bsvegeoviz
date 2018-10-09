import groupBy from "lodash-es/groupBy";
import keys from "lodash-es/keys";
import each from "lodash-es/each";
import has from "lodash-es/has";

export function remove_bsve_css() {
    $('link').each(function (i, el) {
        var $el = $(el);
        if ($el.prop('href').indexOf('font-awesome') >= 0) {
            $el.remove();
        }
        if ($el.prop('href').indexOf('harbinger') >= 0) {
            $el.remove();
        }
    });
}

export function handleDataExchange(store) {
    BSVE.api.exchange.receive((data) => {
        store.commit('addAdhocGeojsonDataset', {
            name: data.name || 'Imported',
            data: data
        });
    });
}

export function handleBsveSearch(store) {
    /*
     * Create a search submit handler.
     * The provided callback function will be executed when a fed search is performed.
     */
    BSVE.api.search.submit(function (query) {
        // There are several problems here that will need to be rethought.
        // 1) We may get this search callback before the Minerva app is ready
        // 2) Due to polling, we may have a pollSearch callback executed after
        // the time that an additional search has been done, so that pollSearch should
        // do nothing.
        // 3) The search GeoJson doesn't appear to behave correctly.  There can
        // be a response with 'Successfully processed' but that doesn't have any geojson,
        // also all geojson is returned at once, rather than per source type, then the geojson
        // needs to be split apart into geojson specific to source types.
        //
        // query object will include all of the search params including the requestId which can be used to make data requests
        console.log('GeoViz submitted search');
        console.log(query);
        // There is a problem trying to trigger the federated search here, as the
        // Minerva app may not be ready to listen yet.
        //
        var dataSources = null;
        // Store DataSource features that have already been processed.
        var sourceTypeFeatures = {};
        var finishedCurrentRequest = false;

        // Store most recent and previous requestId.
        var currentRequestId = false;
        var previousRequestId = false;

        currentRequestId = query.requestId;

        function pollSearch(query) {
            // Need to wait somehow for the Minerva app to be ready before triggering.
            if (currentRequestId !== previousRequestId) {
                // This must be a new query that we haven't yet triggered.
                // minervaEvents.trigger('m:federated_search', query);
                previousRequestId = currentRequestId;
                // This could probably be combined with the logic below to
                // stop polling, but there wasn't time to think it through.
            }
            BSVE.api.get('/api/search/result?requestId=' + query.requestId, function (response) {
                var status;
                // Store available data source types for reference.
                if (!dataSources) {
                    dataSources = response.availableSourceTypes;
                }

                for (var i = dataSources.length - 1; i >= 0; i--) {
                    // Check each data source in the result.
                    status = response.sourceTypeResults[dataSources[i]].status;
                    if (status === 4 || status === 12) {
                        // Supposedly this source type is done, but it may not actually be.
                        // Fetch updated geoJSON and remove this data source from list.
                        var dataSource = dataSources.splice(i, 1);
                        getGeoJSON(query, dataSource[0]);
                    }
                }

                if (dataSources.length) {
                    if (currentRequestId != query.requestId || finishedCurrentRequest) {
                        if (currentRequestId != query.requestId) {
                            console.log('stop polling bc of requestId');
                        } else {
                            console.log('stop polling bc of finished');
                        }
                    } else {
                        // continue polling since there are still in progress sources
                        setTimeout(function () { pollSearch(query); }, 2000);
                    }
                }
            });
        }

        function getGeoJSON(query, dataSourceName) {
            console.log('GeoViz calling getGeoJSON');
            BSVE.api.get('/api/search/util/geomap/geojson/' + query.requestId + '/all', function (response) {
                console.log('Geojson response for ' + dataSourceName);
                if (response.features && response.features.length > 0) {
                    var groupedBySourceType = groupBy(response.features, function (feature) {
                        return feature.properties.SourceType;
                    });
                    // Create a Dataset for each SourceType features array.
                    var sourceTypesWithFeatures = keys(groupedBySourceType);
                    each(sourceTypesWithFeatures, function (sourceType) {
                        if (groupedBySourceType[sourceType] && groupedBySourceType[sourceType].length > 0) {
                            if (has(sourceTypeFeatures, sourceType)) {
                                console.log('Already created a dataset for ' + sourceType);
                            } else {
                                var geojsonData = {
                                    'type': 'FeatureCollection'
                                };
                                geojsonData.features = groupedBySourceType[sourceType];
                                console.log('Creating a dataset for ' + sourceType + ' of length ' + geojsonData.features.length);
                                sourceTypeFeatures[sourceType] = geojsonData.features.length;
                                store.commit('addAdhocGeojsonDataset', {
                                    'geojson': geojsonData,
                                    'name': query.term + ' - ' + sourceType + ' - ' + geojsonData.features.length
                                });
                            }
                            // Assume this means we got some request data back.
                            finishedCurrentRequest = true;
                        } else {
                            console.log('No features for ' + sourceType);
                        }
                    });
                } else {
                    console.log(dataSourceName + ' response is missing features');
                }
            });
        }

        // Start polling.
        pollSearch(query);
    }, true, true, true); // set all 3 flags to true, which will hide the searchbar altogether
}
