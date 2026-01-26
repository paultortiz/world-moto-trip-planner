"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(() => {
var exports = {};
exports.id = "app/api/trips/[id]/share/route";
exports.ids = ["app/api/trips/[id]/share/route"];
exports.modules = {

/***/ "@prisma/client":
/*!*********************************!*\
  !*** external "@prisma/client" ***!
  \*********************************/
/***/ ((module) => {

module.exports = require("@prisma/client");

/***/ }),

/***/ "../../client/components/action-async-storage.external":
/*!*******************************************************************************!*\
  !*** external "next/dist/client/components/action-async-storage.external.js" ***!
  \*******************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/client/components/action-async-storage.external.js");

/***/ }),

/***/ "../../client/components/request-async-storage.external":
/*!********************************************************************************!*\
  !*** external "next/dist/client/components/request-async-storage.external.js" ***!
  \********************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/client/components/request-async-storage.external.js");

/***/ }),

/***/ "../../client/components/static-generation-async-storage.external":
/*!******************************************************************************************!*\
  !*** external "next/dist/client/components/static-generation-async-storage.external.js" ***!
  \******************************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/client/components/static-generation-async-storage.external.js");

/***/ }),

/***/ "next/dist/compiled/next-server/app-page.runtime.dev.js":
/*!*************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-page.runtime.dev.js" ***!
  \*************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/compiled/next-server/app-page.runtime.dev.js");

/***/ }),

/***/ "next/dist/compiled/next-server/app-route.runtime.dev.js":
/*!**************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-route.runtime.dev.js" ***!
  \**************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/compiled/next-server/app-route.runtime.dev.js");

/***/ }),

/***/ "assert":
/*!*************************!*\
  !*** external "assert" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("assert");

/***/ }),

/***/ "buffer":
/*!*************************!*\
  !*** external "buffer" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("buffer");

/***/ }),

/***/ "crypto":
/*!*************************!*\
  !*** external "crypto" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("crypto");

/***/ }),

/***/ "events":
/*!*************************!*\
  !*** external "events" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("events");

/***/ }),

/***/ "http":
/*!***********************!*\
  !*** external "http" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("http");

/***/ }),

/***/ "https":
/*!************************!*\
  !*** external "https" ***!
  \************************/
/***/ ((module) => {

module.exports = require("https");

/***/ }),

/***/ "querystring":
/*!******************************!*\
  !*** external "querystring" ***!
  \******************************/
/***/ ((module) => {

module.exports = require("querystring");

/***/ }),

/***/ "url":
/*!**********************!*\
  !*** external "url" ***!
  \**********************/
/***/ ((module) => {

module.exports = require("url");

/***/ }),

/***/ "util":
/*!***********************!*\
  !*** external "util" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("util");

/***/ }),

/***/ "zlib":
/*!***********************!*\
  !*** external "zlib" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("zlib");

/***/ }),

/***/ "(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Ftrips%2F%5Bid%5D%2Fshare%2Froute&page=%2Fapi%2Ftrips%2F%5Bid%5D%2Fshare%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Ftrips%2F%5Bid%5D%2Fshare%2Froute.ts&appDir=C%3A%5CUsers%5CPaulOrtiz%5Cprojects%5Cworld-moto-trip-planner%5Csrc%5Capp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=C%3A%5CUsers%5CPaulOrtiz%5Cprojects%5Cworld-moto-trip-planner&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!":
/*!************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Ftrips%2F%5Bid%5D%2Fshare%2Froute&page=%2Fapi%2Ftrips%2F%5Bid%5D%2Fshare%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Ftrips%2F%5Bid%5D%2Fshare%2Froute.ts&appDir=C%3A%5CUsers%5CPaulOrtiz%5Cprojects%5Cworld-moto-trip-planner%5Csrc%5Capp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=C%3A%5CUsers%5CPaulOrtiz%5Cprojects%5Cworld-moto-trip-planner&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D! ***!
  \************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   originalPathname: () => (/* binding */ originalPathname),\n/* harmony export */   patchFetch: () => (/* binding */ patchFetch),\n/* harmony export */   requestAsyncStorage: () => (/* binding */ requestAsyncStorage),\n/* harmony export */   routeModule: () => (/* binding */ routeModule),\n/* harmony export */   serverHooks: () => (/* binding */ serverHooks),\n/* harmony export */   staticGenerationAsyncStorage: () => (/* binding */ staticGenerationAsyncStorage)\n/* harmony export */ });\n/* harmony import */ var next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/dist/server/future/route-modules/app-route/module.compiled */ \"(rsc)/./node_modules/next/dist/server/future/route-modules/app-route/module.compiled.js\");\n/* harmony import */ var next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var next_dist_server_future_route_kind__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/dist/server/future/route-kind */ \"(rsc)/./node_modules/next/dist/server/future/route-kind.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! next/dist/server/lib/patch-fetch */ \"(rsc)/./node_modules/next/dist/server/lib/patch-fetch.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var C_Users_PaulOrtiz_projects_world_moto_trip_planner_src_app_api_trips_id_share_route_ts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./src/app/api/trips/[id]/share/route.ts */ \"(rsc)/./src/app/api/trips/[id]/share/route.ts\");\n\n\n\n\n// We inject the nextConfigOutput here so that we can use them in the route\n// module.\nconst nextConfigOutput = \"\"\nconst routeModule = new next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__.AppRouteRouteModule({\n    definition: {\n        kind: next_dist_server_future_route_kind__WEBPACK_IMPORTED_MODULE_1__.RouteKind.APP_ROUTE,\n        page: \"/api/trips/[id]/share/route\",\n        pathname: \"/api/trips/[id]/share\",\n        filename: \"route\",\n        bundlePath: \"app/api/trips/[id]/share/route\"\n    },\n    resolvedPagePath: \"C:\\\\Users\\\\PaulOrtiz\\\\projects\\\\world-moto-trip-planner\\\\src\\\\app\\\\api\\\\trips\\\\[id]\\\\share\\\\route.ts\",\n    nextConfigOutput,\n    userland: C_Users_PaulOrtiz_projects_world_moto_trip_planner_src_app_api_trips_id_share_route_ts__WEBPACK_IMPORTED_MODULE_3__\n});\n// Pull out the exports that we need to expose from the module. This should\n// be eliminated when we've moved the other routes to the new format. These\n// are used to hook into the route.\nconst { requestAsyncStorage, staticGenerationAsyncStorage, serverHooks } = routeModule;\nconst originalPathname = \"/api/trips/[id]/share/route\";\nfunction patchFetch() {\n    return (0,next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__.patchFetch)({\n        serverHooks,\n        staticGenerationAsyncStorage\n    });\n}\n\n\n//# sourceMappingURL=app-route.js.map//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvbmV4dC9kaXN0L2J1aWxkL3dlYnBhY2svbG9hZGVycy9uZXh0LWFwcC1sb2FkZXIuanM/bmFtZT1hcHAlMkZhcGklMkZ0cmlwcyUyRiU1QmlkJTVEJTJGc2hhcmUlMkZyb3V0ZSZwYWdlPSUyRmFwaSUyRnRyaXBzJTJGJTVCaWQlNUQlMkZzaGFyZSUyRnJvdXRlJmFwcFBhdGhzPSZwYWdlUGF0aD1wcml2YXRlLW5leHQtYXBwLWRpciUyRmFwaSUyRnRyaXBzJTJGJTVCaWQlNUQlMkZzaGFyZSUyRnJvdXRlLnRzJmFwcERpcj1DJTNBJTVDVXNlcnMlNUNQYXVsT3J0aXolNUNwcm9qZWN0cyU1Q3dvcmxkLW1vdG8tdHJpcC1wbGFubmVyJTVDc3JjJTVDYXBwJnBhZ2VFeHRlbnNpb25zPXRzeCZwYWdlRXh0ZW5zaW9ucz10cyZwYWdlRXh0ZW5zaW9ucz1qc3gmcGFnZUV4dGVuc2lvbnM9anMmcm9vdERpcj1DJTNBJTVDVXNlcnMlNUNQYXVsT3J0aXolNUNwcm9qZWN0cyU1Q3dvcmxkLW1vdG8tdHJpcC1wbGFubmVyJmlzRGV2PXRydWUmdHNjb25maWdQYXRoPXRzY29uZmlnLmpzb24mYmFzZVBhdGg9JmFzc2V0UHJlZml4PSZuZXh0Q29uZmlnT3V0cHV0PSZwcmVmZXJyZWRSZWdpb249Jm1pZGRsZXdhcmVDb25maWc9ZTMwJTNEISIsIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFBc0c7QUFDdkM7QUFDYztBQUNvRDtBQUNqSTtBQUNBO0FBQ0E7QUFDQSx3QkFBd0IsZ0hBQW1CO0FBQzNDO0FBQ0EsY0FBYyx5RUFBUztBQUN2QjtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBO0FBQ0EsWUFBWTtBQUNaLENBQUM7QUFDRDtBQUNBO0FBQ0E7QUFDQSxRQUFRLGlFQUFpRTtBQUN6RTtBQUNBO0FBQ0EsV0FBVyw0RUFBVztBQUN0QjtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ3VIOztBQUV2SCIsInNvdXJjZXMiOlsid2VicGFjazovL3dvcmxkLW1vdG8tdHJpcC1wbGFubmVyLz8wMGNmIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFwcFJvdXRlUm91dGVNb2R1bGUgfSBmcm9tIFwibmV4dC9kaXN0L3NlcnZlci9mdXR1cmUvcm91dGUtbW9kdWxlcy9hcHAtcm91dGUvbW9kdWxlLmNvbXBpbGVkXCI7XG5pbXBvcnQgeyBSb3V0ZUtpbmQgfSBmcm9tIFwibmV4dC9kaXN0L3NlcnZlci9mdXR1cmUvcm91dGUta2luZFwiO1xuaW1wb3J0IHsgcGF0Y2hGZXRjaCBhcyBfcGF0Y2hGZXRjaCB9IGZyb20gXCJuZXh0L2Rpc3Qvc2VydmVyL2xpYi9wYXRjaC1mZXRjaFwiO1xuaW1wb3J0ICogYXMgdXNlcmxhbmQgZnJvbSBcIkM6XFxcXFVzZXJzXFxcXFBhdWxPcnRpelxcXFxwcm9qZWN0c1xcXFx3b3JsZC1tb3RvLXRyaXAtcGxhbm5lclxcXFxzcmNcXFxcYXBwXFxcXGFwaVxcXFx0cmlwc1xcXFxbaWRdXFxcXHNoYXJlXFxcXHJvdXRlLnRzXCI7XG4vLyBXZSBpbmplY3QgdGhlIG5leHRDb25maWdPdXRwdXQgaGVyZSBzbyB0aGF0IHdlIGNhbiB1c2UgdGhlbSBpbiB0aGUgcm91dGVcbi8vIG1vZHVsZS5cbmNvbnN0IG5leHRDb25maWdPdXRwdXQgPSBcIlwiXG5jb25zdCByb3V0ZU1vZHVsZSA9IG5ldyBBcHBSb3V0ZVJvdXRlTW9kdWxlKHtcbiAgICBkZWZpbml0aW9uOiB7XG4gICAgICAgIGtpbmQ6IFJvdXRlS2luZC5BUFBfUk9VVEUsXG4gICAgICAgIHBhZ2U6IFwiL2FwaS90cmlwcy9baWRdL3NoYXJlL3JvdXRlXCIsXG4gICAgICAgIHBhdGhuYW1lOiBcIi9hcGkvdHJpcHMvW2lkXS9zaGFyZVwiLFxuICAgICAgICBmaWxlbmFtZTogXCJyb3V0ZVwiLFxuICAgICAgICBidW5kbGVQYXRoOiBcImFwcC9hcGkvdHJpcHMvW2lkXS9zaGFyZS9yb3V0ZVwiXG4gICAgfSxcbiAgICByZXNvbHZlZFBhZ2VQYXRoOiBcIkM6XFxcXFVzZXJzXFxcXFBhdWxPcnRpelxcXFxwcm9qZWN0c1xcXFx3b3JsZC1tb3RvLXRyaXAtcGxhbm5lclxcXFxzcmNcXFxcYXBwXFxcXGFwaVxcXFx0cmlwc1xcXFxbaWRdXFxcXHNoYXJlXFxcXHJvdXRlLnRzXCIsXG4gICAgbmV4dENvbmZpZ091dHB1dCxcbiAgICB1c2VybGFuZFxufSk7XG4vLyBQdWxsIG91dCB0aGUgZXhwb3J0cyB0aGF0IHdlIG5lZWQgdG8gZXhwb3NlIGZyb20gdGhlIG1vZHVsZS4gVGhpcyBzaG91bGRcbi8vIGJlIGVsaW1pbmF0ZWQgd2hlbiB3ZSd2ZSBtb3ZlZCB0aGUgb3RoZXIgcm91dGVzIHRvIHRoZSBuZXcgZm9ybWF0LiBUaGVzZVxuLy8gYXJlIHVzZWQgdG8gaG9vayBpbnRvIHRoZSByb3V0ZS5cbmNvbnN0IHsgcmVxdWVzdEFzeW5jU3RvcmFnZSwgc3RhdGljR2VuZXJhdGlvbkFzeW5jU3RvcmFnZSwgc2VydmVySG9va3MgfSA9IHJvdXRlTW9kdWxlO1xuY29uc3Qgb3JpZ2luYWxQYXRobmFtZSA9IFwiL2FwaS90cmlwcy9baWRdL3NoYXJlL3JvdXRlXCI7XG5mdW5jdGlvbiBwYXRjaEZldGNoKCkge1xuICAgIHJldHVybiBfcGF0Y2hGZXRjaCh7XG4gICAgICAgIHNlcnZlckhvb2tzLFxuICAgICAgICBzdGF0aWNHZW5lcmF0aW9uQXN5bmNTdG9yYWdlXG4gICAgfSk7XG59XG5leHBvcnQgeyByb3V0ZU1vZHVsZSwgcmVxdWVzdEFzeW5jU3RvcmFnZSwgc3RhdGljR2VuZXJhdGlvbkFzeW5jU3RvcmFnZSwgc2VydmVySG9va3MsIG9yaWdpbmFsUGF0aG5hbWUsIHBhdGNoRmV0Y2gsICB9O1xuXG4vLyMgc291cmNlTWFwcGluZ1VSTD1hcHAtcm91dGUuanMubWFwIl0sIm5hbWVzIjpbXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Ftrips%2F%5Bid%5D%2Fshare%2Froute&page=%2Fapi%2Ftrips%2F%5Bid%5D%2Fshare%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Ftrips%2F%5Bid%5D%2Fshare%2Froute.ts&appDir=C%3A%5CUsers%5CPaulOrtiz%5Cprojects%5Cworld-moto-trip-planner%5Csrc%5Capp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=C%3A%5CUsers%5CPaulOrtiz%5Cprojects%5Cworld-moto-trip-planner&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!\n");

/***/ }),

/***/ "(rsc)/./src/app/api/trips/[id]/share/route.ts":
/*!***********************************************!*\
  !*** ./src/app/api/trips/[id]/share/route.ts ***!
  \***********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   POST: () => (/* binding */ POST)\n/* harmony export */ });\n/* harmony import */ var next_server__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/server */ \"(rsc)/./node_modules/next/dist/api/server.js\");\n/* harmony import */ var _lib_prisma__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @/lib/prisma */ \"(rsc)/./src/lib/prisma.ts\");\n/* harmony import */ var _auth__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @/auth */ \"(rsc)/./src/auth.ts\");\n/* harmony import */ var crypto__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! crypto */ \"crypto\");\n/* harmony import */ var crypto__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(crypto__WEBPACK_IMPORTED_MODULE_3__);\n\n\n\n\nasync function POST(req, { params }) {\n    const session = await (0,_auth__WEBPACK_IMPORTED_MODULE_2__.auth)();\n    if (!session?.user || !session.user.id) {\n        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n            error: \"Unauthorized\"\n        }, {\n            status: 401\n        });\n    }\n    const userId = session.user.id;\n    const { id } = params;\n    try {\n        const body = await req.json().catch(()=>({}));\n        const { enabled } = body ?? {};\n        const enableSharing = enabled !== false;\n        // Ensure trip belongs to user\n        const trip = await _lib_prisma__WEBPACK_IMPORTED_MODULE_1__.prisma.trip.findFirst({\n            where: {\n                id,\n                userId\n            }\n        });\n        if (!trip) {\n            return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n                error: \"Trip not found\"\n            }, {\n                status: 404\n            });\n        }\n        let updated;\n        if (!enableSharing) {\n            updated = await _lib_prisma__WEBPACK_IMPORTED_MODULE_1__.prisma.trip.update({\n                where: {\n                    id\n                },\n                data: {\n                    isPublic: false\n                }\n            });\n        } else {\n            const token = trip.shareToken ?? (0,crypto__WEBPACK_IMPORTED_MODULE_3__.randomUUID)().replace(/-/g, \"\");\n            updated = await _lib_prisma__WEBPACK_IMPORTED_MODULE_1__.prisma.trip.update({\n                where: {\n                    id\n                },\n                data: {\n                    isPublic: true,\n                    shareToken: token\n                }\n            });\n        }\n        const origin = req.nextUrl.origin;\n        const shareToken = updated.shareToken ?? null;\n        const shareUrl = updated.isPublic && shareToken ? `${origin}/share/${shareToken}` : null;\n        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n            isPublic: updated.isPublic,\n            shareToken,\n            shareUrl\n        });\n    } catch (error) {\n        console.error(\"Error updating trip sharing\", error);\n        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n            error: \"Failed to update trip sharing\"\n        }, {\n            status: 500\n        });\n    }\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9zcmMvYXBwL2FwaS90cmlwcy9baWRdL3NoYXJlL3JvdXRlLnRzIiwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUF3RDtBQUNsQjtBQUNSO0FBQ007QUFNN0IsZUFBZUksS0FBS0MsR0FBZ0IsRUFBRSxFQUFFQyxNQUFNLEVBQWU7SUFDbEUsTUFBTUMsVUFBVSxNQUFNTCwyQ0FBSUE7SUFDMUIsSUFBSSxDQUFDSyxTQUFTQyxRQUFRLENBQUMsUUFBU0EsSUFBSSxDQUFTQyxFQUFFLEVBQUU7UUFDL0MsT0FBT1QscURBQVlBLENBQUNVLElBQUksQ0FBQztZQUFFQyxPQUFPO1FBQWUsR0FBRztZQUFFQyxRQUFRO1FBQUk7SUFDcEU7SUFFQSxNQUFNQyxTQUFTLFFBQVNMLElBQUksQ0FBU0MsRUFBRTtJQUN2QyxNQUFNLEVBQUVBLEVBQUUsRUFBRSxHQUFHSDtJQUVmLElBQUk7UUFDRixNQUFNUSxPQUFPLE1BQU1ULElBQUlLLElBQUksR0FBR0ssS0FBSyxDQUFDLElBQU8sRUFBQztRQUM1QyxNQUFNLEVBQUVDLE9BQU8sRUFBRSxHQUFHRixRQUFRLENBQUM7UUFDN0IsTUFBTUcsZ0JBQWdCRCxZQUFZO1FBRWxDLDhCQUE4QjtRQUM5QixNQUFNRSxPQUFPLE1BQU1qQiwrQ0FBTUEsQ0FBQ2lCLElBQUksQ0FBQ0MsU0FBUyxDQUFDO1lBQUVDLE9BQU87Z0JBQUVYO2dCQUFJSTtZQUFPO1FBQUU7UUFDakUsSUFBSSxDQUFDSyxNQUFNO1lBQ1QsT0FBT2xCLHFEQUFZQSxDQUFDVSxJQUFJLENBQUM7Z0JBQUVDLE9BQU87WUFBaUIsR0FBRztnQkFBRUMsUUFBUTtZQUFJO1FBQ3RFO1FBRUEsSUFBSVM7UUFDSixJQUFJLENBQUNKLGVBQWU7WUFDbEJJLFVBQVUsTUFBTXBCLCtDQUFNQSxDQUFDaUIsSUFBSSxDQUFDSSxNQUFNLENBQUM7Z0JBQ2pDRixPQUFPO29CQUFFWDtnQkFBRztnQkFDWmMsTUFBTTtvQkFBRUMsVUFBVTtnQkFBTTtZQUMxQjtRQUNGLE9BQU87WUFDTCxNQUFNQyxRQUFRUCxLQUFLUSxVQUFVLElBQUl2QixrREFBVUEsR0FBR3dCLE9BQU8sQ0FBQyxNQUFNO1lBQzVETixVQUFVLE1BQU1wQiwrQ0FBTUEsQ0FBQ2lCLElBQUksQ0FBQ0ksTUFBTSxDQUFDO2dCQUNqQ0YsT0FBTztvQkFBRVg7Z0JBQUc7Z0JBQ1pjLE1BQU07b0JBQ0pDLFVBQVU7b0JBQ1ZFLFlBQVlEO2dCQUNkO1lBQ0Y7UUFDRjtRQUVBLE1BQU1HLFNBQVN2QixJQUFJd0IsT0FBTyxDQUFDRCxNQUFNO1FBQ2pDLE1BQU1GLGFBQWFMLFFBQVFLLFVBQVUsSUFBSTtRQUN6QyxNQUFNSSxXQUFXVCxRQUFRRyxRQUFRLElBQUlFLGFBQWEsQ0FBQyxFQUFFRSxPQUFPLE9BQU8sRUFBRUYsV0FBVyxDQUFDLEdBQUc7UUFFcEYsT0FBTzFCLHFEQUFZQSxDQUFDVSxJQUFJLENBQUM7WUFDdkJjLFVBQVVILFFBQVFHLFFBQVE7WUFDMUJFO1lBQ0FJO1FBQ0Y7SUFDRixFQUFFLE9BQU9uQixPQUFPO1FBQ2RvQixRQUFRcEIsS0FBSyxDQUFDLCtCQUErQkE7UUFDN0MsT0FBT1gscURBQVlBLENBQUNVLElBQUksQ0FBQztZQUFFQyxPQUFPO1FBQWdDLEdBQUc7WUFBRUMsUUFBUTtRQUFJO0lBQ3JGO0FBQ0YiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly93b3JsZC1tb3RvLXRyaXAtcGxhbm5lci8uL3NyYy9hcHAvYXBpL3RyaXBzL1tpZF0vc2hhcmUvcm91dGUudHM/ZTY3ZSJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBOZXh0UmVxdWVzdCwgTmV4dFJlc3BvbnNlIH0gZnJvbSBcIm5leHQvc2VydmVyXCI7XHJcbmltcG9ydCB7IHByaXNtYSB9IGZyb20gXCJAL2xpYi9wcmlzbWFcIjtcclxuaW1wb3J0IHsgYXV0aCB9IGZyb20gXCJAL2F1dGhcIjtcclxuaW1wb3J0IHsgcmFuZG9tVVVJRCB9IGZyb20gXCJjcnlwdG9cIjtcclxuXHJcbmludGVyZmFjZSBSb3V0ZVBhcmFtcyB7XHJcbiAgcGFyYW1zOiB7IGlkOiBzdHJpbmcgfTtcclxufVxyXG5cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIFBPU1QocmVxOiBOZXh0UmVxdWVzdCwgeyBwYXJhbXMgfTogUm91dGVQYXJhbXMpIHtcclxuICBjb25zdCBzZXNzaW9uID0gYXdhaXQgYXV0aCgpO1xyXG4gIGlmICghc2Vzc2lvbj8udXNlciB8fCAhKHNlc3Npb24udXNlciBhcyBhbnkpLmlkKSB7XHJcbiAgICByZXR1cm4gTmV4dFJlc3BvbnNlLmpzb24oeyBlcnJvcjogXCJVbmF1dGhvcml6ZWRcIiB9LCB7IHN0YXR1czogNDAxIH0pO1xyXG4gIH1cclxuXHJcbiAgY29uc3QgdXNlcklkID0gKHNlc3Npb24udXNlciBhcyBhbnkpLmlkIGFzIHN0cmluZztcclxuICBjb25zdCB7IGlkIH0gPSBwYXJhbXM7XHJcblxyXG4gIHRyeSB7XHJcbiAgICBjb25zdCBib2R5ID0gYXdhaXQgcmVxLmpzb24oKS5jYXRjaCgoKSA9PiAoe30pKTtcclxuICAgIGNvbnN0IHsgZW5hYmxlZCB9ID0gYm9keSA/PyB7fTtcclxuICAgIGNvbnN0IGVuYWJsZVNoYXJpbmcgPSBlbmFibGVkICE9PSBmYWxzZTtcclxuXHJcbiAgICAvLyBFbnN1cmUgdHJpcCBiZWxvbmdzIHRvIHVzZXJcclxuICAgIGNvbnN0IHRyaXAgPSBhd2FpdCBwcmlzbWEudHJpcC5maW5kRmlyc3QoeyB3aGVyZTogeyBpZCwgdXNlcklkIH0gfSk7XHJcbiAgICBpZiAoIXRyaXApIHtcclxuICAgICAgcmV0dXJuIE5leHRSZXNwb25zZS5qc29uKHsgZXJyb3I6IFwiVHJpcCBub3QgZm91bmRcIiB9LCB7IHN0YXR1czogNDA0IH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGxldCB1cGRhdGVkO1xyXG4gICAgaWYgKCFlbmFibGVTaGFyaW5nKSB7XHJcbiAgICAgIHVwZGF0ZWQgPSBhd2FpdCBwcmlzbWEudHJpcC51cGRhdGUoe1xyXG4gICAgICAgIHdoZXJlOiB7IGlkIH0sXHJcbiAgICAgICAgZGF0YTogeyBpc1B1YmxpYzogZmFsc2UgfSxcclxuICAgICAgfSk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBjb25zdCB0b2tlbiA9IHRyaXAuc2hhcmVUb2tlbiA/PyByYW5kb21VVUlEKCkucmVwbGFjZSgvLS9nLCBcIlwiKTtcclxuICAgICAgdXBkYXRlZCA9IGF3YWl0IHByaXNtYS50cmlwLnVwZGF0ZSh7XHJcbiAgICAgICAgd2hlcmU6IHsgaWQgfSxcclxuICAgICAgICBkYXRhOiB7XHJcbiAgICAgICAgICBpc1B1YmxpYzogdHJ1ZSxcclxuICAgICAgICAgIHNoYXJlVG9rZW46IHRva2VuLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IG9yaWdpbiA9IHJlcS5uZXh0VXJsLm9yaWdpbjtcclxuICAgIGNvbnN0IHNoYXJlVG9rZW4gPSB1cGRhdGVkLnNoYXJlVG9rZW4gPz8gbnVsbDtcclxuICAgIGNvbnN0IHNoYXJlVXJsID0gdXBkYXRlZC5pc1B1YmxpYyAmJiBzaGFyZVRva2VuID8gYCR7b3JpZ2lufS9zaGFyZS8ke3NoYXJlVG9rZW59YCA6IG51bGw7XHJcblxyXG4gICAgcmV0dXJuIE5leHRSZXNwb25zZS5qc29uKHtcclxuICAgICAgaXNQdWJsaWM6IHVwZGF0ZWQuaXNQdWJsaWMsXHJcbiAgICAgIHNoYXJlVG9rZW4sXHJcbiAgICAgIHNoYXJlVXJsLFxyXG4gICAgfSk7XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoXCJFcnJvciB1cGRhdGluZyB0cmlwIHNoYXJpbmdcIiwgZXJyb3IpO1xyXG4gICAgcmV0dXJuIE5leHRSZXNwb25zZS5qc29uKHsgZXJyb3I6IFwiRmFpbGVkIHRvIHVwZGF0ZSB0cmlwIHNoYXJpbmdcIiB9LCB7IHN0YXR1czogNTAwIH0pO1xyXG4gIH1cclxufVxyXG4iXSwibmFtZXMiOlsiTmV4dFJlc3BvbnNlIiwicHJpc21hIiwiYXV0aCIsInJhbmRvbVVVSUQiLCJQT1NUIiwicmVxIiwicGFyYW1zIiwic2Vzc2lvbiIsInVzZXIiLCJpZCIsImpzb24iLCJlcnJvciIsInN0YXR1cyIsInVzZXJJZCIsImJvZHkiLCJjYXRjaCIsImVuYWJsZWQiLCJlbmFibGVTaGFyaW5nIiwidHJpcCIsImZpbmRGaXJzdCIsIndoZXJlIiwidXBkYXRlZCIsInVwZGF0ZSIsImRhdGEiLCJpc1B1YmxpYyIsInRva2VuIiwic2hhcmVUb2tlbiIsInJlcGxhY2UiLCJvcmlnaW4iLCJuZXh0VXJsIiwic2hhcmVVcmwiLCJjb25zb2xlIl0sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(rsc)/./src/app/api/trips/[id]/share/route.ts\n");

/***/ }),

/***/ "(rsc)/./src/auth.ts":
/*!*********************!*\
  !*** ./src/auth.ts ***!
  \*********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   auth: () => (/* binding */ auth),\n/* harmony export */   authOptions: () => (/* binding */ authOptions)\n/* harmony export */ });\n/* harmony import */ var next_auth__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next-auth */ \"(rsc)/./node_modules/next-auth/index.js\");\n/* harmony import */ var next_auth__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(next_auth__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var next_auth_providers_google__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next-auth/providers/google */ \"(rsc)/./node_modules/next-auth/providers/google.js\");\n/* harmony import */ var _next_auth_prisma_adapter__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @next-auth/prisma-adapter */ \"(rsc)/./node_modules/@next-auth/prisma-adapter/dist/index.js\");\n/* harmony import */ var _lib_prisma__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @/lib/prisma */ \"(rsc)/./src/lib/prisma.ts\");\n\n\n\n\nconst authOptions = {\n    adapter: (0,_next_auth_prisma_adapter__WEBPACK_IMPORTED_MODULE_2__.PrismaAdapter)(_lib_prisma__WEBPACK_IMPORTED_MODULE_3__.prisma),\n    providers: [\n        (0,next_auth_providers_google__WEBPACK_IMPORTED_MODULE_1__[\"default\"])({\n            clientId: process.env.GOOGLE_CLIENT_ID,\n            clientSecret: process.env.GOOGLE_CLIENT_SECRET\n        })\n    ],\n    session: {\n        strategy: \"database\"\n    },\n    callbacks: {\n        async session ({ session, user }) {\n            if (session.user) {\n                // Expose user id on the session so we can use it in route handlers.\n                session.user.id = user.id;\n            }\n            return session;\n        }\n    }\n};\nfunction auth() {\n    return (0,next_auth__WEBPACK_IMPORTED_MODULE_0__.getServerSession)(authOptions);\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9zcmMvYXV0aC50cyIsIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBQTZFO0FBQ3JCO0FBQ0U7QUFDcEI7QUFFL0IsTUFBTUksY0FBK0I7SUFDMUNDLFNBQVNILHdFQUFhQSxDQUFDQywrQ0FBTUE7SUFDN0JHLFdBQVc7UUFDVEwsc0VBQWNBLENBQUM7WUFDYk0sVUFBVUMsUUFBUUMsR0FBRyxDQUFDQyxnQkFBZ0I7WUFDdENDLGNBQWNILFFBQVFDLEdBQUcsQ0FBQ0csb0JBQW9CO1FBQ2hEO0tBQ0Q7SUFDREMsU0FBUztRQUNQQyxVQUFVO0lBQ1o7SUFDQUMsV0FBVztRQUNULE1BQU1GLFNBQVEsRUFBRUEsT0FBTyxFQUFFRyxJQUFJLEVBQUU7WUFDN0IsSUFBSUgsUUFBUUcsSUFBSSxFQUFFO2dCQUNoQixvRUFBb0U7Z0JBQ25FSCxRQUFRRyxJQUFJLENBQVNDLEVBQUUsR0FBRyxLQUFjQSxFQUFFO1lBQzdDO1lBQ0EsT0FBT0o7UUFDVDtJQUNGO0FBQ0YsRUFBRTtBQUVLLFNBQVNLO0lBQ2QsT0FBT2xCLDJEQUFnQkEsQ0FBQ0k7QUFDMUIiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly93b3JsZC1tb3RvLXRyaXAtcGxhbm5lci8uL3NyYy9hdXRoLnRzPzYyZDkiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IE5leHRBdXRoLCB7IGdldFNlcnZlclNlc3Npb24sIHR5cGUgTmV4dEF1dGhPcHRpb25zIH0gZnJvbSBcIm5leHQtYXV0aFwiO1xyXG5pbXBvcnQgR29vZ2xlUHJvdmlkZXIgZnJvbSBcIm5leHQtYXV0aC9wcm92aWRlcnMvZ29vZ2xlXCI7XHJcbmltcG9ydCB7IFByaXNtYUFkYXB0ZXIgfSBmcm9tIFwiQG5leHQtYXV0aC9wcmlzbWEtYWRhcHRlclwiO1xyXG5pbXBvcnQgeyBwcmlzbWEgfSBmcm9tIFwiQC9saWIvcHJpc21hXCI7XHJcblxyXG5leHBvcnQgY29uc3QgYXV0aE9wdGlvbnM6IE5leHRBdXRoT3B0aW9ucyA9IHtcclxuICBhZGFwdGVyOiBQcmlzbWFBZGFwdGVyKHByaXNtYSksXHJcbiAgcHJvdmlkZXJzOiBbXHJcbiAgICBHb29nbGVQcm92aWRlcih7XHJcbiAgICAgIGNsaWVudElkOiBwcm9jZXNzLmVudi5HT09HTEVfQ0xJRU5UX0lEISxcclxuICAgICAgY2xpZW50U2VjcmV0OiBwcm9jZXNzLmVudi5HT09HTEVfQ0xJRU5UX1NFQ1JFVCEsXHJcbiAgICB9KSxcclxuICBdLFxyXG4gIHNlc3Npb246IHtcclxuICAgIHN0cmF0ZWd5OiBcImRhdGFiYXNlXCIsXHJcbiAgfSxcclxuICBjYWxsYmFja3M6IHtcclxuICAgIGFzeW5jIHNlc3Npb24oeyBzZXNzaW9uLCB1c2VyIH0pIHtcclxuICAgICAgaWYgKHNlc3Npb24udXNlcikge1xyXG4gICAgICAgIC8vIEV4cG9zZSB1c2VyIGlkIG9uIHRoZSBzZXNzaW9uIHNvIHdlIGNhbiB1c2UgaXQgaW4gcm91dGUgaGFuZGxlcnMuXHJcbiAgICAgICAgKHNlc3Npb24udXNlciBhcyBhbnkpLmlkID0gKHVzZXIgYXMgYW55KS5pZDtcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gc2Vzc2lvbjtcclxuICAgIH0sXHJcbiAgfSxcclxufTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBhdXRoKCkge1xyXG4gIHJldHVybiBnZXRTZXJ2ZXJTZXNzaW9uKGF1dGhPcHRpb25zKTtcclxufVxyXG4iXSwibmFtZXMiOlsiZ2V0U2VydmVyU2Vzc2lvbiIsIkdvb2dsZVByb3ZpZGVyIiwiUHJpc21hQWRhcHRlciIsInByaXNtYSIsImF1dGhPcHRpb25zIiwiYWRhcHRlciIsInByb3ZpZGVycyIsImNsaWVudElkIiwicHJvY2VzcyIsImVudiIsIkdPT0dMRV9DTElFTlRfSUQiLCJjbGllbnRTZWNyZXQiLCJHT09HTEVfQ0xJRU5UX1NFQ1JFVCIsInNlc3Npb24iLCJzdHJhdGVneSIsImNhbGxiYWNrcyIsInVzZXIiLCJpZCIsImF1dGgiXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(rsc)/./src/auth.ts\n");

/***/ }),

/***/ "(rsc)/./src/lib/prisma.ts":
/*!***************************!*\
  !*** ./src/lib/prisma.ts ***!
  \***************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   prisma: () => (/* binding */ prisma)\n/* harmony export */ });\n/* harmony import */ var _prisma_client__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @prisma/client */ \"@prisma/client\");\n/* harmony import */ var _prisma_client__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_prisma_client__WEBPACK_IMPORTED_MODULE_0__);\n\n// Prevent creating multiple PrismaClient instances in development\nconst globalForPrisma = globalThis;\nconst prisma = globalForPrisma.prisma ?? new _prisma_client__WEBPACK_IMPORTED_MODULE_0__.PrismaClient({\n    log: [\n        \"error\",\n        \"warn\"\n    ]\n});\nif (true) {\n    globalForPrisma.prisma = prisma;\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9zcmMvbGliL3ByaXNtYS50cyIsIm1hcHBpbmdzIjoiOzs7Ozs7QUFBOEM7QUFFOUMsa0VBQWtFO0FBQ2xFLE1BQU1DLGtCQUFrQkM7QUFJakIsTUFBTUMsU0FDWEYsZ0JBQWdCRSxNQUFNLElBQ3RCLElBQUlILHdEQUFZQSxDQUFDO0lBQ2ZJLEtBQUs7UUFBQztRQUFTO0tBQU87QUFDeEIsR0FBRztBQUVMLElBQUlDLElBQXFDLEVBQUU7SUFDekNKLGdCQUFnQkUsTUFBTSxHQUFHQTtBQUMzQiIsInNvdXJjZXMiOlsid2VicGFjazovL3dvcmxkLW1vdG8tdHJpcC1wbGFubmVyLy4vc3JjL2xpYi9wcmlzbWEudHM/MDFkNyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBQcmlzbWFDbGllbnQgfSBmcm9tIFwiQHByaXNtYS9jbGllbnRcIjtcclxuXHJcbi8vIFByZXZlbnQgY3JlYXRpbmcgbXVsdGlwbGUgUHJpc21hQ2xpZW50IGluc3RhbmNlcyBpbiBkZXZlbG9wbWVudFxyXG5jb25zdCBnbG9iYWxGb3JQcmlzbWEgPSBnbG9iYWxUaGlzIGFzIHVua25vd24gYXMge1xyXG4gIHByaXNtYT86IFByaXNtYUNsaWVudDtcclxufTtcclxuXHJcbmV4cG9ydCBjb25zdCBwcmlzbWEgPVxyXG4gIGdsb2JhbEZvclByaXNtYS5wcmlzbWEgPz9cclxuICBuZXcgUHJpc21hQ2xpZW50KHtcclxuICAgIGxvZzogW1wiZXJyb3JcIiwgXCJ3YXJuXCJdLFxyXG4gIH0pO1xyXG5cclxuaWYgKHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSBcInByb2R1Y3Rpb25cIikge1xyXG4gIGdsb2JhbEZvclByaXNtYS5wcmlzbWEgPSBwcmlzbWE7XHJcbn1cclxuIl0sIm5hbWVzIjpbIlByaXNtYUNsaWVudCIsImdsb2JhbEZvclByaXNtYSIsImdsb2JhbFRoaXMiLCJwcmlzbWEiLCJsb2ciLCJwcm9jZXNzIl0sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(rsc)/./src/lib/prisma.ts\n");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../../../../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/next","vendor-chunks/next-auth","vendor-chunks/openid-client","vendor-chunks/oauth","vendor-chunks/@babel","vendor-chunks/preact","vendor-chunks/uuid","vendor-chunks/@next-auth","vendor-chunks/yallist","vendor-chunks/preact-render-to-string","vendor-chunks/oidc-token-hash","vendor-chunks/@panva"], () => (__webpack_exec__("(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Ftrips%2F%5Bid%5D%2Fshare%2Froute&page=%2Fapi%2Ftrips%2F%5Bid%5D%2Fshare%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Ftrips%2F%5Bid%5D%2Fshare%2Froute.ts&appDir=C%3A%5CUsers%5CPaulOrtiz%5Cprojects%5Cworld-moto-trip-planner%5Csrc%5Capp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=C%3A%5CUsers%5CPaulOrtiz%5Cprojects%5Cworld-moto-trip-planner&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!")));
module.exports = __webpack_exports__;

})();