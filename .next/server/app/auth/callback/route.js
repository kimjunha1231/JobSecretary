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
exports.id = "app/auth/callback/route";
exports.ids = ["app/auth/callback/route"];
exports.modules = {

/***/ "next/dist/compiled/next-server/app-page.runtime.dev.js":
/*!*************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-page.runtime.dev.js" ***!
  \*************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/compiled/next-server/app-page.runtime.dev.js");

/***/ }),

/***/ "next/dist/compiled/next-server/app-route.runtime.dev.js":
/*!**************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-route.runtime.dev.js" ***!
  \**************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/compiled/next-server/app-route.runtime.dev.js");

/***/ }),

/***/ "../app-render/after-task-async-storage.external":
/*!***********************************************************************************!*\
  !*** external "next/dist/server/app-render/after-task-async-storage.external.js" ***!
  \***********************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/server/app-render/after-task-async-storage.external.js");

/***/ }),

/***/ "../app-render/work-async-storage.external":
/*!*****************************************************************************!*\
  !*** external "next/dist/server/app-render/work-async-storage.external.js" ***!
  \*****************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/server/app-render/work-async-storage.external.js");

/***/ }),

/***/ "./work-unit-async-storage.external":
/*!**********************************************************************************!*\
  !*** external "next/dist/server/app-render/work-unit-async-storage.external.js" ***!
  \**********************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/server/app-render/work-unit-async-storage.external.js");

/***/ }),

/***/ "(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fauth%2Fcallback%2Froute&page=%2Fauth%2Fcallback%2Froute&appPaths=&pagePath=private-next-app-dir%2Fauth%2Fcallback%2Froute.ts&appDir=%2FUsers%2Fjunha%2Fcoding%2Fcareervault-ai%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fjunha%2Fcoding%2Fcareervault-ai&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!":
/*!*************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fauth%2Fcallback%2Froute&page=%2Fauth%2Fcallback%2Froute&appPaths=&pagePath=private-next-app-dir%2Fauth%2Fcallback%2Froute.ts&appDir=%2FUsers%2Fjunha%2Fcoding%2Fcareervault-ai%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fjunha%2Fcoding%2Fcareervault-ai&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D! ***!
  \*************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   patchFetch: () => (/* binding */ patchFetch),\n/* harmony export */   routeModule: () => (/* binding */ routeModule),\n/* harmony export */   serverHooks: () => (/* binding */ serverHooks),\n/* harmony export */   workAsyncStorage: () => (/* binding */ workAsyncStorage),\n/* harmony export */   workUnitAsyncStorage: () => (/* binding */ workUnitAsyncStorage)\n/* harmony export */ });\n/* harmony import */ var next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/dist/server/route-modules/app-route/module.compiled */ \"(rsc)/./node_modules/next/dist/server/route-modules/app-route/module.compiled.js\");\n/* harmony import */ var next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var next_dist_server_route_kind__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/dist/server/route-kind */ \"(rsc)/./node_modules/next/dist/server/route-kind.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! next/dist/server/lib/patch-fetch */ \"(rsc)/./node_modules/next/dist/server/lib/patch-fetch.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var _Users_junha_coding_careervault_ai_app_auth_callback_route_ts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./app/auth/callback/route.ts */ \"(rsc)/./app/auth/callback/route.ts\");\n\n\n\n\n// We inject the nextConfigOutput here so that we can use them in the route\n// module.\nconst nextConfigOutput = \"\"\nconst routeModule = new next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__.AppRouteRouteModule({\n    definition: {\n        kind: next_dist_server_route_kind__WEBPACK_IMPORTED_MODULE_1__.RouteKind.APP_ROUTE,\n        page: \"/auth/callback/route\",\n        pathname: \"/auth/callback\",\n        filename: \"route\",\n        bundlePath: \"app/auth/callback/route\"\n    },\n    resolvedPagePath: \"/Users/junha/coding/careervault-ai/app/auth/callback/route.ts\",\n    nextConfigOutput,\n    userland: _Users_junha_coding_careervault_ai_app_auth_callback_route_ts__WEBPACK_IMPORTED_MODULE_3__\n});\n// Pull out the exports that we need to expose from the module. This should\n// be eliminated when we've moved the other routes to the new format. These\n// are used to hook into the route.\nconst { workAsyncStorage, workUnitAsyncStorage, serverHooks } = routeModule;\nfunction patchFetch() {\n    return (0,next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__.patchFetch)({\n        workAsyncStorage,\n        workUnitAsyncStorage\n    });\n}\n\n\n//# sourceMappingURL=app-route.js.map//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvbmV4dC9kaXN0L2J1aWxkL3dlYnBhY2svbG9hZGVycy9uZXh0LWFwcC1sb2FkZXIvaW5kZXguanM/bmFtZT1hcHAlMkZhdXRoJTJGY2FsbGJhY2slMkZyb3V0ZSZwYWdlPSUyRmF1dGglMkZjYWxsYmFjayUyRnJvdXRlJmFwcFBhdGhzPSZwYWdlUGF0aD1wcml2YXRlLW5leHQtYXBwLWRpciUyRmF1dGglMkZjYWxsYmFjayUyRnJvdXRlLnRzJmFwcERpcj0lMkZVc2VycyUyRmp1bmhhJTJGY29kaW5nJTJGY2FyZWVydmF1bHQtYWklMkZhcHAmcGFnZUV4dGVuc2lvbnM9dHN4JnBhZ2VFeHRlbnNpb25zPXRzJnBhZ2VFeHRlbnNpb25zPWpzeCZwYWdlRXh0ZW5zaW9ucz1qcyZyb290RGlyPSUyRlVzZXJzJTJGanVuaGElMkZjb2RpbmclMkZjYXJlZXJ2YXVsdC1haSZpc0Rldj10cnVlJnRzY29uZmlnUGF0aD10c2NvbmZpZy5qc29uJmJhc2VQYXRoPSZhc3NldFByZWZpeD0mbmV4dENvbmZpZ091dHB1dD0mcHJlZmVycmVkUmVnaW9uPSZtaWRkbGV3YXJlQ29uZmlnPWUzMCUzRCEiLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFBK0Y7QUFDdkM7QUFDcUI7QUFDYTtBQUMxRjtBQUNBO0FBQ0E7QUFDQSx3QkFBd0IseUdBQW1CO0FBQzNDO0FBQ0EsY0FBYyxrRUFBUztBQUN2QjtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBO0FBQ0EsWUFBWTtBQUNaLENBQUM7QUFDRDtBQUNBO0FBQ0E7QUFDQSxRQUFRLHNEQUFzRDtBQUM5RDtBQUNBLFdBQVcsNEVBQVc7QUFDdEI7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUMwRjs7QUFFMUYiLCJzb3VyY2VzIjpbIiJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBcHBSb3V0ZVJvdXRlTW9kdWxlIH0gZnJvbSBcIm5leHQvZGlzdC9zZXJ2ZXIvcm91dGUtbW9kdWxlcy9hcHAtcm91dGUvbW9kdWxlLmNvbXBpbGVkXCI7XG5pbXBvcnQgeyBSb3V0ZUtpbmQgfSBmcm9tIFwibmV4dC9kaXN0L3NlcnZlci9yb3V0ZS1raW5kXCI7XG5pbXBvcnQgeyBwYXRjaEZldGNoIGFzIF9wYXRjaEZldGNoIH0gZnJvbSBcIm5leHQvZGlzdC9zZXJ2ZXIvbGliL3BhdGNoLWZldGNoXCI7XG5pbXBvcnQgKiBhcyB1c2VybGFuZCBmcm9tIFwiL1VzZXJzL2p1bmhhL2NvZGluZy9jYXJlZXJ2YXVsdC1haS9hcHAvYXV0aC9jYWxsYmFjay9yb3V0ZS50c1wiO1xuLy8gV2UgaW5qZWN0IHRoZSBuZXh0Q29uZmlnT3V0cHV0IGhlcmUgc28gdGhhdCB3ZSBjYW4gdXNlIHRoZW0gaW4gdGhlIHJvdXRlXG4vLyBtb2R1bGUuXG5jb25zdCBuZXh0Q29uZmlnT3V0cHV0ID0gXCJcIlxuY29uc3Qgcm91dGVNb2R1bGUgPSBuZXcgQXBwUm91dGVSb3V0ZU1vZHVsZSh7XG4gICAgZGVmaW5pdGlvbjoge1xuICAgICAgICBraW5kOiBSb3V0ZUtpbmQuQVBQX1JPVVRFLFxuICAgICAgICBwYWdlOiBcIi9hdXRoL2NhbGxiYWNrL3JvdXRlXCIsXG4gICAgICAgIHBhdGhuYW1lOiBcIi9hdXRoL2NhbGxiYWNrXCIsXG4gICAgICAgIGZpbGVuYW1lOiBcInJvdXRlXCIsXG4gICAgICAgIGJ1bmRsZVBhdGg6IFwiYXBwL2F1dGgvY2FsbGJhY2svcm91dGVcIlxuICAgIH0sXG4gICAgcmVzb2x2ZWRQYWdlUGF0aDogXCIvVXNlcnMvanVuaGEvY29kaW5nL2NhcmVlcnZhdWx0LWFpL2FwcC9hdXRoL2NhbGxiYWNrL3JvdXRlLnRzXCIsXG4gICAgbmV4dENvbmZpZ091dHB1dCxcbiAgICB1c2VybGFuZFxufSk7XG4vLyBQdWxsIG91dCB0aGUgZXhwb3J0cyB0aGF0IHdlIG5lZWQgdG8gZXhwb3NlIGZyb20gdGhlIG1vZHVsZS4gVGhpcyBzaG91bGRcbi8vIGJlIGVsaW1pbmF0ZWQgd2hlbiB3ZSd2ZSBtb3ZlZCB0aGUgb3RoZXIgcm91dGVzIHRvIHRoZSBuZXcgZm9ybWF0LiBUaGVzZVxuLy8gYXJlIHVzZWQgdG8gaG9vayBpbnRvIHRoZSByb3V0ZS5cbmNvbnN0IHsgd29ya0FzeW5jU3RvcmFnZSwgd29ya1VuaXRBc3luY1N0b3JhZ2UsIHNlcnZlckhvb2tzIH0gPSByb3V0ZU1vZHVsZTtcbmZ1bmN0aW9uIHBhdGNoRmV0Y2goKSB7XG4gICAgcmV0dXJuIF9wYXRjaEZldGNoKHtcbiAgICAgICAgd29ya0FzeW5jU3RvcmFnZSxcbiAgICAgICAgd29ya1VuaXRBc3luY1N0b3JhZ2VcbiAgICB9KTtcbn1cbmV4cG9ydCB7IHJvdXRlTW9kdWxlLCB3b3JrQXN5bmNTdG9yYWdlLCB3b3JrVW5pdEFzeW5jU3RvcmFnZSwgc2VydmVySG9va3MsIHBhdGNoRmV0Y2gsICB9O1xuXG4vLyMgc291cmNlTWFwcGluZ1VSTD1hcHAtcm91dGUuanMubWFwIl0sIm5hbWVzIjpbXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fauth%2Fcallback%2Froute&page=%2Fauth%2Fcallback%2Froute&appPaths=&pagePath=private-next-app-dir%2Fauth%2Fcallback%2Froute.ts&appDir=%2FUsers%2Fjunha%2Fcoding%2Fcareervault-ai%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fjunha%2Fcoding%2Fcareervault-ai&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!\n");

/***/ }),

/***/ "(rsc)/./node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true!":
/*!******************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true! ***!
  \******************************************************************************************************/
/***/ (() => {



/***/ }),

/***/ "(ssr)/./node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true!":
/*!******************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true! ***!
  \******************************************************************************************************/
/***/ (() => {



/***/ }),

/***/ "(rsc)/./app/auth/callback/route.ts":
/*!************************************!*\
  !*** ./app/auth/callback/route.ts ***!
  \************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   GET: () => (/* binding */ GET)\n/* harmony export */ });\n/* harmony import */ var _supabase_ssr__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @supabase/ssr */ \"(rsc)/./node_modules/@supabase/ssr/dist/module/index.js\");\n/* harmony import */ var next_headers__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/headers */ \"(rsc)/./node_modules/next/dist/api/headers.js\");\n/* harmony import */ var next_server__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! next/server */ \"(rsc)/./node_modules/next/dist/api/server.js\");\n\n\n\nasync function GET(request) {\n    const { searchParams, origin } = new URL(request.url);\n    const code = searchParams.get('code');\n    const next = searchParams.get('next') ?? '/archive';\n    if (code) {\n        const cookieStore = await (0,next_headers__WEBPACK_IMPORTED_MODULE_1__.cookies)();\n        const supabase = (0,_supabase_ssr__WEBPACK_IMPORTED_MODULE_0__.createServerClient)(\"https://uoogquwrzytpnyhjkqpk.supabase.co\", \"sb_publishable_t4ETXw2dUK4_0L4m1KepXg_HwmDH7Vx\", {\n            cookies: {\n                get (name) {\n                    return cookieStore.get(name)?.value;\n                },\n                set (name, value, options) {\n                    cookieStore.set({\n                        name,\n                        value,\n                        ...options\n                    });\n                },\n                remove (name, options) {\n                    cookieStore.set({\n                        name,\n                        value: '',\n                        ...options\n                    });\n                }\n            }\n        });\n        const { error } = await supabase.auth.exchangeCodeForSession(code);\n        if (!error) {\n            const nextUrl = new URL(next, origin);\n            nextUrl.searchParams.set('login', 'success');\n            return next_server__WEBPACK_IMPORTED_MODULE_2__.NextResponse.redirect(nextUrl);\n        }\n    }\n    // return the user to an error page with instructions\n    return next_server__WEBPACK_IMPORTED_MODULE_2__.NextResponse.redirect(`${origin}/auth/auth-code-error`);\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9hcHAvYXV0aC9jYWxsYmFjay9yb3V0ZS50cyIsIm1hcHBpbmdzIjoiOzs7Ozs7O0FBQXVFO0FBQ2hDO0FBQ0k7QUFFcEMsZUFBZUcsSUFBSUMsT0FBZ0I7SUFDdEMsTUFBTSxFQUFFQyxZQUFZLEVBQUVDLE1BQU0sRUFBRSxHQUFHLElBQUlDLElBQUlILFFBQVFJLEdBQUc7SUFDcEQsTUFBTUMsT0FBT0osYUFBYUssR0FBRyxDQUFDO0lBQzlCLE1BQU1DLE9BQU9OLGFBQWFLLEdBQUcsQ0FBQyxXQUFXO0lBRXpDLElBQUlELE1BQU07UUFDTixNQUFNRyxjQUFjLE1BQU1YLHFEQUFPQTtRQUNqQyxNQUFNWSxXQUFXYixpRUFBa0JBLENBQy9CYywwQ0FBb0MsRUFDcENBLGdEQUF5QyxFQUN6QztZQUNJYixTQUFTO2dCQUNMUyxLQUFJUSxJQUFZO29CQUNaLE9BQU9OLFlBQVlGLEdBQUcsQ0FBQ1EsT0FBT0M7Z0JBQ2xDO2dCQUNBQyxLQUFJRixJQUFZLEVBQUVDLEtBQWEsRUFBRUUsT0FBc0I7b0JBQ25EVCxZQUFZUSxHQUFHLENBQUM7d0JBQUVGO3dCQUFNQzt3QkFBTyxHQUFHRSxPQUFPO29CQUFDO2dCQUM5QztnQkFDQUMsUUFBT0osSUFBWSxFQUFFRyxPQUFzQjtvQkFDdkNULFlBQVlRLEdBQUcsQ0FBQzt3QkFBRUY7d0JBQU1DLE9BQU87d0JBQUksR0FBR0UsT0FBTztvQkFBQztnQkFDbEQ7WUFDSjtRQUNKO1FBR0osTUFBTSxFQUFFRSxLQUFLLEVBQUUsR0FBRyxNQUFNVixTQUFTVyxJQUFJLENBQUNDLHNCQUFzQixDQUFDaEI7UUFDN0QsSUFBSSxDQUFDYyxPQUFPO1lBQ1IsTUFBTUcsVUFBVSxJQUFJbkIsSUFBSUksTUFBTUw7WUFDOUJvQixRQUFRckIsWUFBWSxDQUFDZSxHQUFHLENBQUMsU0FBUztZQUNsQyxPQUFPbEIscURBQVlBLENBQUN5QixRQUFRLENBQUNEO1FBQ2pDO0lBQ0o7SUFFQSxxREFBcUQ7SUFDckQsT0FBT3hCLHFEQUFZQSxDQUFDeUIsUUFBUSxDQUFDLEdBQUdyQixPQUFPLHFCQUFxQixDQUFDO0FBQ2pFIiwic291cmNlcyI6WyIvVXNlcnMvanVuaGEvY29kaW5nL2NhcmVlcnZhdWx0LWFpL2FwcC9hdXRoL2NhbGxiYWNrL3JvdXRlLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGNyZWF0ZVNlcnZlckNsaWVudCwgdHlwZSBDb29raWVPcHRpb25zIH0gZnJvbSAnQHN1cGFiYXNlL3Nzcic7XG5pbXBvcnQgeyBjb29raWVzIH0gZnJvbSAnbmV4dC9oZWFkZXJzJztcbmltcG9ydCB7IE5leHRSZXNwb25zZSB9IGZyb20gJ25leHQvc2VydmVyJztcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIEdFVChyZXF1ZXN0OiBSZXF1ZXN0KSB7XG4gICAgY29uc3QgeyBzZWFyY2hQYXJhbXMsIG9yaWdpbiB9ID0gbmV3IFVSTChyZXF1ZXN0LnVybCk7XG4gICAgY29uc3QgY29kZSA9IHNlYXJjaFBhcmFtcy5nZXQoJ2NvZGUnKTtcbiAgICBjb25zdCBuZXh0ID0gc2VhcmNoUGFyYW1zLmdldCgnbmV4dCcpID8/ICcvYXJjaGl2ZSc7XG5cbiAgICBpZiAoY29kZSkge1xuICAgICAgICBjb25zdCBjb29raWVTdG9yZSA9IGF3YWl0IGNvb2tpZXMoKTtcbiAgICAgICAgY29uc3Qgc3VwYWJhc2UgPSBjcmVhdGVTZXJ2ZXJDbGllbnQoXG4gICAgICAgICAgICBwcm9jZXNzLmVudi5ORVhUX1BVQkxJQ19TVVBBQkFTRV9VUkwhLFxuICAgICAgICAgICAgcHJvY2Vzcy5lbnYuTkVYVF9QVUJMSUNfU1VQQUJBU0VfQU5PTl9LRVkhLFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGNvb2tpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgZ2V0KG5hbWU6IHN0cmluZykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNvb2tpZVN0b3JlLmdldChuYW1lKT8udmFsdWU7XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHNldChuYW1lOiBzdHJpbmcsIHZhbHVlOiBzdHJpbmcsIG9wdGlvbnM6IENvb2tpZU9wdGlvbnMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvb2tpZVN0b3JlLnNldCh7IG5hbWUsIHZhbHVlLCAuLi5vcHRpb25zIH0pO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICByZW1vdmUobmFtZTogc3RyaW5nLCBvcHRpb25zOiBDb29raWVPcHRpb25zKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb29raWVTdG9yZS5zZXQoeyBuYW1lLCB2YWx1ZTogJycsIC4uLm9wdGlvbnMgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcblxuICAgICAgICBjb25zdCB7IGVycm9yIH0gPSBhd2FpdCBzdXBhYmFzZS5hdXRoLmV4Y2hhbmdlQ29kZUZvclNlc3Npb24oY29kZSk7XG4gICAgICAgIGlmICghZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnN0IG5leHRVcmwgPSBuZXcgVVJMKG5leHQsIG9yaWdpbik7XG4gICAgICAgICAgICBuZXh0VXJsLnNlYXJjaFBhcmFtcy5zZXQoJ2xvZ2luJywgJ3N1Y2Nlc3MnKTtcbiAgICAgICAgICAgIHJldHVybiBOZXh0UmVzcG9uc2UucmVkaXJlY3QobmV4dFVybCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyByZXR1cm4gdGhlIHVzZXIgdG8gYW4gZXJyb3IgcGFnZSB3aXRoIGluc3RydWN0aW9uc1xuICAgIHJldHVybiBOZXh0UmVzcG9uc2UucmVkaXJlY3QoYCR7b3JpZ2lufS9hdXRoL2F1dGgtY29kZS1lcnJvcmApO1xufVxuIl0sIm5hbWVzIjpbImNyZWF0ZVNlcnZlckNsaWVudCIsImNvb2tpZXMiLCJOZXh0UmVzcG9uc2UiLCJHRVQiLCJyZXF1ZXN0Iiwic2VhcmNoUGFyYW1zIiwib3JpZ2luIiwiVVJMIiwidXJsIiwiY29kZSIsImdldCIsIm5leHQiLCJjb29raWVTdG9yZSIsInN1cGFiYXNlIiwicHJvY2VzcyIsImVudiIsIk5FWFRfUFVCTElDX1NVUEFCQVNFX1VSTCIsIk5FWFRfUFVCTElDX1NVUEFCQVNFX0FOT05fS0VZIiwibmFtZSIsInZhbHVlIiwic2V0Iiwib3B0aW9ucyIsInJlbW92ZSIsImVycm9yIiwiYXV0aCIsImV4Y2hhbmdlQ29kZUZvclNlc3Npb24iLCJuZXh0VXJsIiwicmVkaXJlY3QiXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(rsc)/./app/auth/callback/route.ts\n");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/@supabase","vendor-chunks/next","vendor-chunks/tslib","vendor-chunks/cookie"], () => (__webpack_exec__("(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fauth%2Fcallback%2Froute&page=%2Fauth%2Fcallback%2Froute&appPaths=&pagePath=private-next-app-dir%2Fauth%2Fcallback%2Froute.ts&appDir=%2FUsers%2Fjunha%2Fcoding%2Fcareervault-ai%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fjunha%2Fcoding%2Fcareervault-ai&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!")));
module.exports = __webpack_exports__;

})();