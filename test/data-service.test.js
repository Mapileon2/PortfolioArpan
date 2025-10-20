const assert = require('chai').assert;
const sinon = require('sinon');
const proxyquire = require('proxyquire');

const firestoreStub = {
  collection: sinon.stub().returns({
    doc: sinon.stub().returns({
      get: sinon.stub().resolves({
        exists: true,
        data: () => ({ publicId: 'old-public-id' }),
      }),
      update: sinon.stub().resolves(),
    }),
  }),
};

const dataService = proxyquire('../data-service', {
  './firebase-admin': {
    firestore: firestoreStub,
  },
});

const imageService = require('../image-service');

describe('dataService.carouselImages.update', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should not delete the old image if the new image upload fails', async () => {
    const imageId = 'test-id';
    const imageData = { file: { buffer: Buffer.from('test') } };

    const uploadStub = sandbox.stub(imageService, 'uploadImage').rejects(new Error('Upload failed'));
    const deleteStub = sandbox.stub(imageService, 'deleteImage').resolves(true);

    let error;
    try {
      await dataService.carouselImages.update(imageId, imageData, 'test-user');
    } catch (e) {
      error = e;
    }

    assert.instanceOf(error, Error);
    assert.equal(error.message, 'Upload failed');
    assert.isTrue(uploadStub.calledOnce);
    assert.isTrue(deleteStub.notCalled, 'deleteImage should not be called');
  });

  it('should delete the old image if the new image upload succeeds', async () => {
    const imageId = 'test-id';
    const imageData = { file: { buffer: Buffer.from('test') } };

    const uploadStub = sandbox.stub(imageService, 'uploadImage').resolves({ publicId: 'new-public-id' });
    const deleteStub = sandbox.stub(imageService, 'deleteImage').resolves(true);

    await dataService.carouselImages.update(imageId, imageData, 'test-user');

    assert.isTrue(uploadStub.calledOnce);
    assert.isTrue(deleteStub.calledOnce);
  });
});