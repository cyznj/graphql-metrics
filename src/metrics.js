import { floor, forIn, get, reduce, toLower, unset } from 'lodash';

const os = require('os');
const Influx = require('influx');

const measurement = 'graphql_aggregated_response';

const aggregatedData = {};

const resolvers = [];

function _zeroData() {
  const initialDatum = {
    count: 0,
  };

  return reduce(
    resolvers,
    (memo, resolver) => {
      const resolverCountKey = toLower(`${resolver}_count`);
      const resolver4XXCountKey = toLower(`${resolver}_4XX_count`);
      const resolver5XXCountKey = toLower(`${resolver}_5XX_count`);
      const totalResponseTimeKey = toLower(`${resolver}_total_response_time`);
      const averageResponseTimeKey = toLower(`${resolver}_ave_response_time`);
      return {
        ...memo,
        [resolverCountKey]: 0,
        [totalResponseTimeKey]: 0,
        [averageResponseTimeKey]: 0,
        [resolver4XXCountKey]: 0,
        [resolver5XXCountKey]: 0,
      };
    },
    initialDatum,
  );
}

function _currentInterval() {
  return Math.floor(Date.now() / metricIntervalMs);
}

export default class WPGraphQLMetrics {
  constructor({
    influxSettings,
    site,
    hostname,
    logFunc,
    metricIntervalMs,
    enableGraphQLMetrics = true,
  }) {
    this.resolvers = [];
    this.logFunc = logFunc;
    this.enableGraphQLMetrics = enableGraphQLMetrics;
    this.influx = new Influx.InfluxDB(influxSettings);
    this.site = site;
    this.hostname = hostname;
    this.metricIntervalMs = metricIntervalMs; // how often to flush aggregated metrics to influx
  }

  addResolverMetric(resolverName) {
    this.resolvers.push(resolverName);
  }

  initMetrics() {
    const firstInterval = _currentInterval();
    aggregatedData[firstInterval] = _zeroData();
    aggregatedData[firstInterval + 1] = _zeroData();
  }

  runMetricInterval() {
    setInterval(this._flushMetrics, this.metricIntervalMs);
  }

  _flushMetrics() {
    const currentInterval = _currentInterval();

    // initialize the next interval
    const nextInterval = currentInterval + 1;
    aggregatedData[nextInterval] = _zeroData();

    const points = [];

    // flush and remove any previous metrics
    forIn(aggregatedData, (value, key) => {
      if (key < currentInterval) {
        points.push({
          timestamp: new Date(key * metricIntervalMs),
          measurement,
          tags: {
            site,
            hostname,
          },
          fields: value,
        });

        unset(aggregatedData, key);
      }
    });

    if (this.enableGraphQLMetrics) {
      influx.writePoints(points).catch((err) => {
        this.logFunc(
          'WPGRAPHQL',
          'ERROR',
          'Error sending data to InfluxDB',
          err,
        );
      });
    }
  }

  logMetrics({ resolverName, responseTime, status }) {
    if (!this.enableGraphQLMetrics) {
      return;
    }
    const currentInterval = _currentInterval();
    const currentData = aggregatedData[currentInterval];
    if (currentData) {
      const countKey = 'count';
      const resolverCountKey = toLower(`${resolverName}_count`);
      const totalResponseTimeKey = toLower(
        `${resolverName}_total_response_time`,
      );
      const averageResponseTimeKey = toLower(
        `${resolverName}_ave_response_time`,
      );

      currentData[countKey] = 1 + get(currentData, countKey, 0);
      currentData[resolverCountKey] = 1 + get(currentData, resolverCountKey, 0);
      currentData[totalResponseTimeKey] =
        responseTime + get(currentData, totalResponseTimeKey, 0);
      currentData[averageResponseTimeKey] =
        currentData[totalResponseTimeKey] / currentData[resolverCountKey];

      // if it was an error, then increment 4XX or 5XX counters
      const statusXX = floor(status / 100);
      if (statusXX > 3) {
        const resolverStatusCountKey = toLower(
          `${resolverName}_${statusXX}XX_count`,
        );
        currentData[resolverStatusCountKey] =
          1 + get(currentData, resolverStatusCountKey, 0);
      }
    }
  }
}
