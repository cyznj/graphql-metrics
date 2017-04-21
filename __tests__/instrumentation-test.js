import sinon from 'sinon';
import test from 'ava';
import { instrumentResolvers, WPGraphQLMetrics } from '../src';

const Metrics = new WPGraphQLMetrics({
  site: 'www.hello.com',
  hostname: 'hello',
  logFunc: console.log,
  metricIntervalMs: 6000,
});

test('Log Func should be called', (t) => {
  const stub = sinon.stub(console, 'log');

  const stubResolvers = instrumentResolvers(
    {
      Query: {
        foobar() {
          return 'Hello World';
        },
      },
      Mutation: {
        setfoobar() {
          return 'Baz';
        },
      },
    },
    stub,
    { INFO: 'info', ERROR: 'error' },
    Metrics,
  );


  stubResolvers.Query.foobar();

  t.truthy(stub.called);

  t.truthy(stub.calledWith('info'));

  stubResolvers.Mutation.setfoobar();

  t.truthy(stub.called);

  t.truthy(stub.calledWith('info'));
});
