const { SwaggerRouter } = require('koa-swagger-decorator');
const { router: ApiRouter } = require('./api/index');
const { router: AdminRouter } = require('./admin/index');

const router = new SwaggerRouter();

router.use('/api', ApiRouter.routes());
router.use('/admin', AdminRouter.routes());

// swagger docs avaliable at http://localhost:3000/swagger-html
// router.swagger({
//   title: 'API V2 Server',
//   description: 'API DOC',
//   version: '1.0.0'
// });
router.mapDir(__dirname);

module.exports = router;
