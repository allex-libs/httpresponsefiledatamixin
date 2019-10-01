function rowProducer (rowcount, cb) {
  for(var i=0; i<rowcount; i++) {
    cb({
      row: i,
      fld1: 'fld1 in row '+i,
      fld2: 'fld2 in row'+i
    });
  }
}

var _headers = [{name: 'row', title: 'Row'}, {name: 'fld1', title: 'Field 1'}, {name: 'fld2', title: 'Field 2'}];

function createDataArray (rowcount) {
  var ret = [], _r = ret;
  rowProducer(rowcount, function (obj) {
    _r.push(obj);
  });
  _r = null;
  return ret;
}

function fillDataSink (rowcount, sink) {
  var pps = [], _pps = pps, _ds = sink, ret;
  rowProducer(rowcount, function (obj) {
    _pps.push(_ds.call.bind(_ds, 'create', obj));
  });
  _pps = null;
  //_ds = null;
  ret = (new qlib.PromiseExecutorJob(pps)).go();
  return ret;
}


var _rowcount = 10;

function test (ctorfunc, expectedresult, generationoptions, finalresultconversion) {
  function conv (result) {
    if (lib.isFunction(finalresultconversion)) {
      return finalresultconversion(result);
    }
    return result;
  }
  if (!lib.isFunction(ctorfunc)) {
    throw new Error('ctorfunc has to be a Function!');
  }
  it('Create a Data Array', function () {
    return setGlobal('DataArray', createDataArray(_rowcount));
  });
  it('Create an XML file with headers', function () {
    var ctor = ctorfunc();
    if (!lib.isFunction(ctorfunc)) {
      throw new Error('Constructor returned by ctorfunc has to be a Function!');
    }
    setGlobal('FileWithHeaders', new ctor('blah.file'));
    FileWithHeaders.includeHeaders = true;
  });
  it('Generate from DataArray', function () {
    expect(qlib.thenableRead(FileWithHeaders.produceFromDataArray(_headers, DataArray, generationoptions)).then(conv)).to.eventually.deep.equal(expectedresult);
  });
  it('Start a Data Service', function () {
    this.timeout(1e8);
    return setGlobal('DataServiceSink', startService({
      modulename: 'test__httpresponsefiledatamixin_dataservice',
      instancename: 'DataService',
      pathtomodule: [__dirname, 'src']
    }));
  });
  it('Obtain DataUserSink', function () {
    return setGlobal('DataUserSink', DataServiceSink.subConnect('.', {name: 'user', role: 'user'}));
  });
  it('Fill the DataSource', function () {
    return fillDataSink(_rowcount, DataUserSink);
  });
  it('Generate from streamInFromDataSink', function () {
    return expect(
      FileWithHeaders.streamInFromDataSink(DataUserSink, null, ['row', 'fld1', 'fld2'], generationoptions).then(conv)
    ).to.eventually.deep.equal(expectedresult);
  });
  it('Clean Up', function () {
    DataServiceSink.destroy();
  });
}

setGlobal('HttpResponseFileFromDataTest', test);
