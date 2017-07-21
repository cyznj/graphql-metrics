# @workpop/graphql-metrics

GraphQL-metrics instruments GraphQL resolvers, logging response times and statuses (if there was an error or not) to the console as well as to InfluxDB.

To install:
```
yarn add @workpop/graphql-metrics
```

## Configuring the metrics logger
```javascript
import { WPGraphQLMetrics } from '@workpop/graphql-metrics';

const hostname = process.env.HOSTNAME;
const site = process.env.SITE;
const service = 'MyAwesomeGraphQLService';
const influxConfig = {
  host: process.env.INFLUX_HOST,
  port: parseInt(process.env.INFLUX_PORT, 10),
  protocol: process.env.INFLUX_PROTOCOL,
  username: process.env.INFLUX_USERNAME,
  password: process.env.INFLUX_PASSWORD,
  database: process.env.INFLUX_DATABASE,
  requestTimeout: parseInt(process.env.INFLUX_REQUEST_TIMEOUT, 10),
};

export const Metrics = new WPGraphQLMetrics({
  site,
  hostname,
  service,
  logFunc: console.log, // eslint-disable-line no-console
  metricIntervalMs: 60000,
  influxSettings: influxConfig,
});
```

## Instrumenting your resolvers
```javascript
import { instrumentResolvers } from '@workpop/graphql-metrics';
import { beersOnTap, pourBeer } from './resolvers';
import { Logger } from './log';

const logger = new Logger('WPGRAPHQL');

const logLevels = {
  INFO: 'info',
  ERROR: 'error',
  WARNING: 'warning',
  TRACE: 'trace',
};

function _logFunction(logLevel, ...args) {
  logger.log(logLevel, ...args);
}

const instrumentedResolvers = instrumentResolvers(
  {
    Query: {
      beersOnTap,
    },
    Mutation: {
      pourBeer,
    },
  },
  _logFunction,  // eslint-disable-line no-console
  logLevels,
  Metrics,
);

```
