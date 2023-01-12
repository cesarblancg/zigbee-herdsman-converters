const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const ota = require('../lib/ota');
const reporting = require('../lib/reporting');
const globalStore = require('../lib/store');
const philips = require('../lib/philips');
const utils = require('../lib/utils');
const libColor = require('../lib/color');
const herdsman = require('zigbee-herdsman');
const e = exposes.presets;
const ea = exposes.access;

// Make sure extend.light_* is not used (hueExtend should be used instead)
const extendDontUse = require('../lib/extend');
const extend = {switch: extendDontUse.switch};

const manufacturerOptions = {manufacturerCode: herdsman.Zcl.ManufacturerCode.PHILIPS};

const hueExtend = {
    light_onoff_brightness: (options={}) => ({
        ...extendDontUse.light_onoff_brightness(options),
        ota: ota.zigbeeOTA,
        meta: {turnsOffAtBrightness1: true},
        toZigbee: extendDontUse.light_onoff_brightness(options).toZigbee.concat([
            tzLocal.hue_power_on_behavior, tzLocal.hue_power_on_error,
        ]),
    }),
    light_onoff_brightness_colortemp: (options={}) => {
        options = {disableHueEffects: true, ...options};
        if (!options.disableHueEffects) options.disableEffect = true;
        const result = extendDontUse.light_onoff_brightness_colortemp(options);
        result['ota'] = ota.zigbeeOTA;
        result['meta'] = {turnsOffAtBrightness1: true};
        result['toZigbee'] = result['toZigbee'].concat([tzLocal.hue_power_on_behavior, tzLocal.hue_power_on_error]);
        if (!options.disableHueEffects) {
            result['toZigbee'] = result['toZigbee'].concat([tzLocal.effect]);
            result['exposes'] = result['exposes'].concat([exposes.enum('effect', ea.SET,
                ['blink', 'breathe', 'okay', 'channel_change', 'candle', 'finish_effect', 'stop_effect', 'stop_hue_effect'])]);
        }
        return result;
    },
    light_onoff_brightness_color: (options={}) => {
        options = {disableHueEffects: true, ...options};
        if (!options.disableHueEffects) options.disableEffect = true;
        const result = extendDontUse.light_onoff_brightness_color({supportsHS: true, ...options});
        result['ota'] = ota.zigbeeOTA;
        result['meta'] = {turnsOffAtBrightness1: true};
        result['toZigbee'] = result['toZigbee'].concat([tzLocal.hue_power_on_behavior, tzLocal.hue_power_on_error]);
        if (!options.disableHueEffects) {
            result['toZigbee'] = result['toZigbee'].concat([tzLocal.effect]);
            result['exposes'] = result['exposes'].concat([exposes.enum('effect', ea.SET, [
                'blink', 'breathe', 'okay', 'channel_change',
                'candle', 'fireplace', 'colorloop',
                'finish_effect', 'stop_effect', 'stop_hue_effect',
            ])]);
        }
        return result;
    },
    light_onoff_brightness_colortemp_color: (options={}) => {
        options = {disableHueEffects: true, ...options};
        if (!options.disableHueEffects) options.disableEffect = true;
        const result = extendDontUse.light_onoff_brightness_colortemp_color({supportsHS: true, ...options});
        result['ota'] = ota.zigbeeOTA;
        result['meta'] = {turnsOffAtBrightness1: true};
        result['toZigbee'] = result['toZigbee'].concat([tzLocal.hue_power_on_behavior, tzLocal.hue_power_on_error]);
        if (!options.disableHueEffects) {
            result['toZigbee'] = result['toZigbee'].concat([tzLocal.effect]);
            result['exposes'] = result['exposes'].concat([exposes.enum('effect', ea.SET, [
                'blink', 'breathe', 'okay', 'channel_change',
                'candle', 'fireplace', 'colorloop',
                'finish_effect', 'stop_effect', 'stop_hue_effect',
            ])]);
        }
        return result;
    },
    light_onoff_brightness_colortemp_color_gradient: (options={}) => {
        options = {supportsHS: true, disableEffect: true, extraEffects: [], ...options};
        const result = extendDontUse.light_onoff_brightness_colortemp_color({noConfigure: true, ...options});
        result['ota'] = ota.zigbeeOTA;
        result['meta'] = {turnsOffAtBrightness1: true};
        result['toZigbee'] = result['toZigbee'].concat([
            tzLocal.hue_power_on_behavior, tzLocal.hue_power_on_error, tzLocal.effect,
            tzLocal.gradient_scene, tzLocal.gradient({reverse: true}),
        ]);
        result['fromZigbee'] = result['fromZigbee'].concat([fzLocal.gradient({reverse: true})]);
        result['configure'] = async (device, coordinatorEndpoint, logger) => {
            await extendDontUse.light_onoff_brightness_colortemp_color(options)
                .configure(device, coordinatorEndpoint, logger);
            for (const ep of device.endpoints) {
                await ep.bind('manuSpecificPhilips2', coordinatorEndpoint);
            }
        };
        result['exposes'] = result['exposes'].concat([
            // gradient_scene is deprecated, use gradient instead
            exposes.enum('gradient_scene', ea.SET, Object.keys(gradientScenes)),
            exposes.list('gradient', ea.ALL, exposes.text('hex', 'Color in RGB HEX format (eg #663399)'))
                .withLengthMin(1)
                .withLengthMax(9)
                .withDescription('List of RGB HEX colors'),
            exposes.enum('effect', ea.SET, [
                'blink', 'breathe', 'okay', 'channel_change',
                'candle', 'fireplace', 'colorloop', 'sunrise',
                'finish_effect', 'stop_effect', 'stop_hue_effect',
                ...options.extraEffects,
            ]),
        ]);
        return result;
    },
};

const gradientScenes = {
    'blossom': '50010400135000000039d553d2955ba5287a9f697e25fb802800',
    'crocus': '50010400135000000050389322f97f2b597343764cc664282800',
    'precious': '5001040013500000007fa8838bb9789a786d7577499a773f2800',
    'narcissa': '500104001350000000b0498a5c0a888fea89eb0b7ee15c742800',
    'beginnings': '500104001350000000b3474def153e2ad42e98232c7483292800',
    'first_light': '500104001350000000b28b7900e959d3f648a614389723362800',
    'horizon': '500104001350000000488b7d6cbb750c6642f1133cc4033c2800',
    'valley_dawn': '500104001350000000c1aa7de03a7a8ce861c7c4410d94412800',
    'sunflare': '500104001350000000d0aa7d787a7daf197590154d6c14472800',
    'emerald_flutter': '5001040013500000006a933977e34bb0d35e916468f246792800',
    'memento': '500104001350000000f87318a3e31962331ec3532cceea892800',
    'resplendent': '500104001350000000278b6d257a58efe84204273a35f5252800',
    'scarlet_dream': '500104001350000000b02c654e4c5b45ab51fb0950d6c84d2800',
    'lovebirds': '50010400135000000053ab84ea1a7e35fb7c098c73994c772800',
    'smitten': '500104001350000000fe7b70a74b6aa42b65811b60550a592800',
    'glitz_and_glam': '500104001350000000cc193cb9b845bad9521d1c77bf6c712800',
    'promise': '500104001350000000258b606eca6b28d6382db445df26812800',
    'ruby_romance': '5001040013500000000edb63cbcb6bac0c670b2d58204e572800',
    'city_of_love': '50010400135000000055830e5cf31b6aa339d2ec70908b802800',
    'honolulu': '500104001350000000dbfd59866c6378ec6c45cc765c0a822800',
    'savanna_sunset': '50010400135000000005ae65c38c6c6b4b7573ca820fc9832800',
    'golden_pond': '5001040013500000007e4a88cc4a8605db8728ec7b666c792800',
    'runy_glow': '50010400135000000095bb53ac2a56eb99591e095c54985e2800',
    'tropical_twilight': '500104001350000000408523a0b636e777524c0a71a76c6e2800',
    'miami': '50010400135000000022ec61e6d94902d83766c3305a43182800',
    'cancun': '500104001350000000a7eb54673d55944e6265fd6e26bb842800',
    'rio': '500104001350000000a26526088c51a74b58ea6b7137ba892800',
    'chinatown': '500104001350000000b33e5b408e59d90d5b4c6c6360ac792800',
    'ibiza': '500104001350000000014d6d708c73827b7b6c7a8887f98a2800',
    'osaka': '500104001350000000d649510b5c4deb7c5d8b6d6d2b9b802800',
    'tokyo': '500104001350000000d1c311665331d3451fd59c4e394c7b2800',
    'motown': '50010400135000000055730e5db3156623306c533d7a235c2800',
    'fairfax': '50010400135000000072d34a3664477d7a61581d5fc08e5b2800',
    'galaxy': '500104001350000000a6cb638b2a4f8cfa549bb9549ff73a2800',
    'starlight': '5001040013500000008d897134a9653ec854d2963ed1d4282800',
    'blood moon': '500104001350000000202a6987c8599ee647ec632779c3142800',
    'artic_aurora': '50010400135000000082548922057511046571c32d5b93192800',
    'moonlight': '50010400135000000055730e5e9320c1832e96243ebec7652800',
    'nebula': '50010400135000000026c852e106460d653ee745342964142800',
    'sundown': '500104001350000000f37c68157c6d8efa755ac5512e24332800',
    'blue_lagoon': '50010400135000000088c3623975699ea672a0c8831ada6d2800',
    'palm_beach': '5001040013500000005ec4679ba56077f85a80ea64639c6a2800',
    'lake_placid': '5001040013500000002eab69239a692d996552c54c39743a2800',
    'mountain_breeze': '500104001350000000df843d2355419195465a98674ca97b2800',
    'lake_mist': '500104001350000000e3286f39b96859f86266e54ded943f2800',
    'ocean_dawn': '5001040013500000005cf9779da97105b96b07485e32564a2800',
    'frosty_dawn': '5001040013500000006d6883bca87e3029758ec9722d6a722800',
    'sunday_morning': '5001040013500000002c586dc6f87345997c63f983f777892800',
    'emerald_isle': '500104001350000000e535628dc57ed2667d8b687d1e2a812800',
    'spring_blossom': '500104001350000000a8b75fd0c75826b851a7094d305b652800',
    'midsummer_sun': '500104001350000000002984799984dd29848eba836c0b7f2800',
    'autumn_gold': '500104001350000000435a7817aa7ba3f979a8a981f3c9852800',
    'spring_lake': '5001040013500000004a976d3347736e677561b77a4b07812800',
    'winter_mountain': '5001040013500000002c555c68c55d7c555ef165606136622800',
    'midwinter': '500104001350000000bda5532c554dbd254cd5a4428d94392800',
    'amber_bloom': '500104001350000000739d67f2bc7372ec78a0ab78be8a6f2800',
    'lily': '5001040013500000009cfc76c5ab793d4a6a1a9b586b9c522800',
    'painted_sky': '500104001350000000d1c424c3d63783384c3f7a6a83bd6d2800',
    'winter_beauty': '500104001350000000e2335ea7b4942467952db986a7ab7b2800',
    'orange_fields': '500104001350000000409c69694c79eafa88498a8fb867aa2800',
    'forest_adventure': '50010400135000000023999bbd76b363d4b674d3415fb3222800',
    'blue_planet': '50010400135000000037a7a3a403b489737b2b746e6873362800',
    'soho': '500104001350000000c52c4e220b6eed8a53d404192b04782800',
    'vapor_wave': '500104001350000000e1c32401251acb183ac31b8051ea842800',
    'magneto': '50010400135000000077b3286d9340b9e3662d99943c9b852800',
    'tyrell': '500104001350000000ef4419a898370ea84698353574434e2800',
    'disturbia': '50010400135000000084f371a4845e6998388c3b4f57ce582800',
    'hal': '50010400135000000075f351a6244cf6dc5d480c658cda862800',
    'golden_star': '5001040013500000007a4a8702eb8372ac7892cd61d51e5c2800',
    'under_the_tree': '5001040013500000001de498b9a3cc0c9b8563bb6cc1ae5d2800',
    'silent_night': '5001040013500000009e296a245a6f660a75086b70953b6e2800',
    'rosy_sparkle': '500104001350000000810967c63a6cb2aa5ea7094eddd73c2800',
    'festive_fun': '5001040013500000005a9318de53123e9414fdcc67839d612800',
    'colour_burst': '500104001350000000f2731ff0c6266a6c64246e57d4f98f2800',
    'crystalline': '5001040013500000006ea96a92a85e58074e18543d9cf3332800',
};

const hueEffects = {
    'candle': '21000101',
    'fireplace': '21000102',
    'colorloop': '21000103',
    'sunrise': '21000109',
    'sparkle': '2100010a',
    'stop_hue_effect': '200000',
};

const fzLocal = {
    hue_tap_dial: {
        cluster: 'manuSpecificPhilips',
        type: 'commandHueNotification',
        options: [exposes.options.simulated_brightness()],
        convert: (model, msg, publish, options, meta) => {
            const buttonLookup = {1: 'button_1', 2: 'button_2', 3: 'button_3', 4: 'button_4', 20: 'dial'};
            const button = buttonLookup[msg.data['button']];
            const typeLookup = {0: 'press', 1: 'hold', 2: 'press_release', 3: 'hold_release'};
            const type = typeLookup[msg.data['type']];
            const direction = msg.data['unknown2'] <127 ? 'right' : 'left';
            const time = msg.data['time'];
            const payload = {};

            if (button === 'dial') {
                const adjustedTime = direction === 'right' ? time : 256 - time;
                const dialType = 'rotate';
                const speed = adjustedTime <= 25 ? 'step' : adjustedTime <= 75 ? 'slow' : 'fast';
                payload.action = `${button}_${dialType}_${direction}_${speed}`;

                // simulated brightness
                if (options.simulated_brightness) {
                    const opts = options.simulated_brightness;
                    const deltaOpts = typeof opts === 'object' && opts.hasOwnProperty('delta') ? opts.delta : 35;
                    const delta = direction === 'right' ? deltaOpts : deltaOpts * -1;
                    const brightness = globalStore.getValue(msg.endpoint, 'brightness', 255) + delta;
                    payload.brightness = utils.numberWithinRange(brightness, 0, 255);
                    globalStore.putValue(msg.endpoint, 'brightness', payload.brightness);
                }
            } else {
                payload.action = `${button}_${type}`;
                // duration
                if (type === 'press') globalStore.putValue(msg.endpoint, 'press_start', Date.now());
                else if (type === 'hold' || type === 'hold_release') {
                    payload.action_duration = (Date.now() - globalStore.getValue(msg.endpoint, 'press_start')) / 1000;
                }
            }
            return payload;
        },
    },
    gradient: (opts = {reverse: false}) => {
        return {
            cluster: 'manuSpecificPhilips2',
            type: ['attributeReport', 'readResponse'],
            convert: (model, msg, publish, options, meta) => {
                if (msg.data && msg.data.hasOwnProperty('state')) {
                    const input = msg.data['state'].toString('hex');
                    const decoded = philips.decodeGradientColors(input, opts);
                    if (decoded.color_mode === 'gradient') {
                        return {gradient: decoded.colors};
                    }
                }
                return {};
            },
        };
    },
};

const tzLocal = {
    gradient_scene: {
        key: ['gradient_scene'],
        convertSet: async (entity, key, value, meta) => {
            const scene = gradientScenes[value];
            if (!scene) throw new Error(`Gradient scene '${value}' is unknown`);
            const payload = {data: Buffer.from(scene, 'hex')};
            await entity.command('manuSpecificPhilips2', 'multiColor', payload);
        },
    },
    gradient: (opts = {reverse: false}) => {
        return {
            key: ['gradient'],
            convertSet: async (entity, key, value, meta) => {
                const scene = philips.encodeGradientColors(value, opts);
                const payload = {data: Buffer.from(scene, 'hex')};
                await entity.command('manuSpecificPhilips2', 'multiColor', payload);
            },
            convertGet: async (entity, key, meta) => {
                await entity.read('manuSpecificPhilips2', ['state']);
            },
        };
    },
    effect: {
        key: ['effect'],
        convertSet: async (entity, key, value, meta) => {
            if (Object.keys(hueEffects).includes(value.toLowerCase())) {
                await entity.command('manuSpecificPhilips2', 'multiColor', {data: Buffer.from(hueEffects[value.toLowerCase()], 'hex')});
            } else {
                return await tz.effect.convertSet(entity, key, value, meta);
            }
        },
    },
    hue_power_on_behavior: {
        key: ['hue_power_on_behavior'],
        convertSet: async (entity, key, value, meta) => {
            if (value === 'default') {
                value = 'on';
            }

            let supports = {colorTemperature: false, colorXY: false};
            if (entity.constructor.name === 'Endpoint' && entity.supportsInputCluster('lightingColorCtrl')) {
                const readResult = await entity.read('lightingColorCtrl', ['colorCapabilities']);
                supports = {
                    colorTemperature: (readResult.colorCapabilities & 1 << 4) > 0,
                    colorXY: (readResult.colorCapabilities & 1 << 3) > 0,
                };
            } else if (entity.constructor.name === 'Group') {
                supports = {colorTemperature: true, colorXY: true};
            }

            if (value === 'off') {
                await entity.write('genOnOff', {0x4003: {value: 0x00, type: 0x30}});
            } else if (value === 'recover') {
                await entity.write('genOnOff', {0x4003: {value: 0xff, type: 0x30}});
                await entity.write('genLevelCtrl', {0x4000: {value: 0xff, type: 0x20}});

                if (supports.colorTemperature) {
                    await entity.write('lightingColorCtrl', {0x4010: {value: 0xffff, type: 0x21}});
                }

                if (supports.colorXY) {
                    await entity.write('lightingColorCtrl', {0x0003: {value: 0xffff, type: 0x21}}, manufacturerOptions);
                    await entity.write('lightingColorCtrl', {0x0004: {value: 0xffff, type: 0x21}}, manufacturerOptions);
                }
            } else if (value === 'on') {
                await entity.write('genOnOff', {0x4003: {value: 0x01, type: 0x30}});

                let brightness = meta.message.hasOwnProperty('hue_power_on_brightness') ?
                    meta.message.hue_power_on_brightness : 0xfe;
                if (brightness === 255) {
                    // 255 (0xFF) is the value for recover, therefore set it to 254 (0xFE)
                    brightness = 254;
                }
                await entity.write('genLevelCtrl', {0x4000: {value: brightness, type: 0x20}});

                if (entity.supportsInputCluster('lightingColorCtrl')) {
                    if (
                        meta.message.hasOwnProperty('hue_power_on_color_temperature') &&
                        meta.message.hasOwnProperty('hue_power_on_color')
                    ) {
                        meta.logger.error(`Provide either color temperature or color, not both`);
                    } else if (meta.message.hasOwnProperty('hue_power_on_color_temperature')) {
                        const colortemp = meta.message.hue_power_on_color_temperature;
                        await entity.write('lightingColorCtrl', {0x4010: {value: colortemp, type: 0x21}});
                        // Set color to default
                        if (supports.colorXY) {
                            await entity.write('lightingColorCtrl', {0x0003: {value: 0xFFFF, type: 0x21}}, manufacturerOptions);
                            await entity.write('lightingColorCtrl', {0x0004: {value: 0xFFFF, type: 0x21}}, manufacturerOptions);
                        }
                    } else if (meta.message.hasOwnProperty('hue_power_on_color')) {
                        const colorXY = libColor.ColorRGB.fromHex(meta.message.hue_power_on_color).toXY();
                        value = {x: utils.mapNumberRange(colorXY.x, 0, 1, 0, 65535), y: utils.mapNumberRange(colorXY.y, 0, 1, 0, 65535)};

                        // Set colortemp to default
                        if (supports.colorTemperature) {
                            await entity.write('lightingColorCtrl', {0x4010: {value: 366, type: 0x21}});
                        }

                        await entity.write('lightingColorCtrl', {0x0003: {value: value.x, type: 0x21}}, manufacturerOptions);
                        await entity.write('lightingColorCtrl', {0x0004: {value: value.y, type: 0x21}}, manufacturerOptions);
                    } else {
                        // Set defaults for colortemp and color
                        if (supports.colorTemperature) {
                            await entity.write('lightingColorCtrl', {0x4010: {value: 366, type: 0x21}});
                        }

                        if (supports.colorXY) {
                            await entity.write('lightingColorCtrl', {0x0003: {value: 0xFFFF, type: 0x21}}, manufacturerOptions);
                            await entity.write('lightingColorCtrl', {0x0004: {value: 0xFFFF, type: 0x21}}, manufacturerOptions);
                        }
                    }
                }
            }

            return {state: {hue_power_on_behavior: value}};
        },
    },
    hue_power_on_error: {
        key: ['hue_power_on_brightness', 'hue_power_on_color_temperature', 'hue_power_on_color'],
        convertSet: async (entity, key, value, meta) => {
            if (!meta.message.hasOwnProperty('hue_power_on_behavior')) {
                throw new Error(`Provide a value for 'hue_power_on_behavior'`);
            }
        },
    },
    hue_motion_sensitivity: {
        // motion detect sensitivity, philips specific
        key: ['motion_sensitivity'],
        convertSet: async (entity, key, value, meta) => {
            // make sure you write to second endpoint!
            const lookup = {'low': 0, 'medium': 1, 'high': 2, 'very_high': 3, 'max': 4};
            value = value.toLowerCase();
            utils.validateValue(value, Object.keys(lookup));

            const payload = {48: {value: lookup[value], type: 32}};
            await entity.write('msOccupancySensing', payload, manufacturerOptions);
            return {state: {motion_sensitivity: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('msOccupancySensing', [48], manufacturerOptions);
        },
    },
    hue_motion_led_indication: {
        key: ['led_indication'],
        convertSet: async (entity, key, value, meta) => {
            const payload = {0x0033: {value, type: 0x10}};
            await entity.write('genBasic', payload, manufacturerOptions);
            return {state: {led_indication: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('genBasic', [0x0033], manufacturerOptions);
        },
    },
};

module.exports = [
    {
        zigbeeModel: ['929003055801'],
        model: '929003055801',
        vendor: 'Philips',
        description: 'Hue white ambiance bathroom ceiling light Adore with Bluetooth',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['929003045301_01', '929003045301_02', '929003045301_03'],
        model: '929003045301',
        vendor: 'Philips',
        description: 'Hue White and Color Ambiance GU10 (Centura)',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['929003045201_01', '929003045201_02', '929003045201_03'],
        model: '929003045201',
        vendor: 'Philips',
        description: 'Hue White and Color Ambiance GU10 (Centura round white)',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['929003047401'],
        model: '929003047401',
        vendor: 'Philips',
        description: 'Hue White and Color Ambiance GU10 (Centura)',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['929003056901'],
        model: '929003056901',
        vendor: 'Philips',
        description: 'Hue Struana 27W',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['LWA018', 'LWA028'],
        model: '9290024693',
        vendor: 'Philips',
        description: 'Hue white A60 bulb B22 1055lm with Bluetooth',
        extend: hueExtend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['LCX004'],
        model: '929002994901',
        vendor: 'Philips',
        description: 'Hue gradient lightstrip',
        extend: hueExtend.light_onoff_brightness_colortemp_color_gradient({disableHueEffects: false, colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['929003045401'],
        model: '929003045401',
        vendor: 'Philips',
        description: 'Hue Centura recessed spotlight white and color ambiance GU10 (black)',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['929003045501_01', '929003045501_02', '929003045501_03'],
        model: '929003045501',
        vendor: 'Philips',
        description: 'Hue Centura recessed spotlight white and color ambiance GU10 (black)',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['929003047501'],
        model: '929003047501',
        vendor: 'Philips',
        description: 'Centura recessed spotlight',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['915005996401', '915005996501'],
        model: '915005996401',
        vendor: 'Philips',
        description: 'Hue white ambiance ceiling light Enrave S with Bluetooth',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['915005996701'],
        model: '915005996701',
        vendor: 'Philips',
        description: 'Hue white ambiance ceiling black Enrave M with Bluetooth',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['915005996601'],
        model: '915005996601',
        vendor: 'Philips',
        description: 'Hue white ambiance ceiling white Enrave M with Bluetooth',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['915005996801', '915005996901'],
        model: '915005996901',
        vendor: 'Philips',
        description: 'Hue white ambiance ceiling light Enrave L with Bluetooth',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['915005997001', '915005997101'],
        model: '915005997001',
        vendor: 'Philips',
        description: 'Hue white ambiance ceiling light Enrave XL with Bluetooth',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['915005997601'],
        model: '915005997601',
        vendor: 'Philips',
        description: 'Hue Devere M white ambiance white & dimmer',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['915005997701'],
        model: '915005997701',
        vendor: 'Philips',
        description: 'Hue Devere L white ambiance white & dimmer',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['929003054001'],
        model: '929003054001',
        vendor: 'Philips',
        description: 'Hue Wellness table lamp',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['4076131P6'],
        model: '4076131P6',
        vendor: 'Philips',
        description: 'Hue white ambiance suspension Cher with bluetooth 3000lm',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['929003054301'],
        model: '929003054301',
        vendor: 'Philips',
        description: 'Hue White Ambiance Cher Pendant',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['5063131P7'],
        model: '5063131P7',
        vendor: 'Philips',
        description: 'Hue Bluetooth white & color ambiance spot Fugato white (1 spots)',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['5633031P9'],
        model: '5633031P9',
        vendor: 'Philips',
        description: 'Hue White ambiance Pillar spotlight',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['929003046001', '929003045801'],
        model: '5309031P8',
        vendor: 'Philips',
        description: 'Hue White ambiance Runner spot white (1 spot)',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['929002376301'],
        model: '929002376301',
        vendor: 'Philips',
        description: 'Hue Iris rose limited edition (generation 4) ',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['929002401201'],
        model: '929002401201',
        vendor: 'Philips',
        description: 'Hue Iris copper special edition (generation 4) ',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['929002376803'],
        model: '929002376803',
        vendor: 'Philips',
        description: 'Hue Iris copper special edition (generation 4)',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['5063130P7'],
        model: '5063130P7',
        vendor: 'Philips',
        description: 'Hue Bluetooth white & color ambiance spot Fugato black (1 spots)',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['3418931P6'],
        model: '3418931P6',
        vendor: 'Philips',
        description: 'Hue white ambiance Struana bathroom ceiling with bluetooth 2400lm',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['LWU001'],
        model: '9290024406',
        vendor: 'Philips',
        description: 'Hue P45 light bulb',
        extend: hueExtend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['LTC002'],
        model: '4034031P7',
        vendor: 'Philips',
        description: 'Hue Fair',
        extend: hueExtend.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['4034031P6'],
        model: '4034031P6',
        vendor: 'Philips',
        description: 'Hue Fair with Bluetooth',
        extend: hueExtend.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['4034030P6'],
        model: '4034030P6',
        vendor: 'Philips',
        description: 'Hue Fair with Bluetooth',
        extend: hueExtend.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['LWO003'],
        model: '8719514279131',
        vendor: 'Philips',
        description: 'Hue white E27 LED bulb filament giant globe',
        extend: hueExtend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['LWO004'],
        model: '8719514279155',
        vendor: 'Philips',
        description: 'Hue white G125 B22 LED bulb filament giant globe',
        extend: hueExtend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['LTD011'],
        model: '5110131H5',
        vendor: 'Philips',
        description: 'Garnea downlight',
        extend: hueExtend.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['LTD012'],
        model: '5111531H5',
        vendor: 'Philips',
        description: 'Garnea downlight',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['LWA010'],
        model: '929002335001',
        vendor: 'Philips',
        description: 'Hue white A21 bulb B22 with Bluetooth (1600 Lumen)',
        extend: hueExtend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['LTC012'],
        model: '3306431P7',
        vendor: 'Philips',
        description: 'Hue Struana',
        extend: hueExtend.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['1746130P7'],
        model: '1746130P7',
        vendor: 'Philips',
        description: 'Hue Attract',
        extend: hueExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['1745630P7'],
        model: '1745630P7',
        vendor: 'Philips',
        description: 'Hue Nyro',
        extend: hueExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['1745530P7'],
        model: '1745530P7',
        vendor: 'Philips',
        description: 'Hue Nyro',
        extend: hueExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['LDT001'],
        model: '5900131C5',
        vendor: 'Philips',
        description: 'Hue Aphelion downlight',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['LLC012', 'LLC011', 'LLC013'],
        model: '7299760PH',
        vendor: 'Philips',
        description: 'Hue Bloom',
        extend: hueExtend.light_onoff_brightness_color(),
    },
    {
        zigbeeModel: ['929002375901'],
        model: '929002375901',
        vendor: 'Philips',
        description: 'Hue Bloom with Bluetooth (White) - EU/UK',
        extend: hueExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['929002376501'],
        model: '929002376501',
        vendor: 'Philips',
        description: 'Hue Bloom Gen4 with Bluetooth (White) - US',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['929002376001'],
        model: '929002376001',
        vendor: 'Philips',
        description: 'Hue Bloom with Bluetooth (Black)',
        extend: hueExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['LCP001', 'LCP002', '4090331P9_01', '4090331P9_02', '929003053301_01', '929003053301_02'],
        model: '4090331P9',
        vendor: 'Philips',
        description: 'Hue Ensis (white)',
        extend: hueExtend.light_onoff_brightness_colortemp_color({disableHueEffects: false, colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['4090330P9_01', '4090330P9_02', '929003052501_01', '929003052501_02'],
        model: '4090330P9',
        vendor: 'Philips',
        description: 'Hue Ensis (black)',
        extend: hueExtend.light_onoff_brightness_colortemp_color({disableHueEffects: false, colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['929003055901', '929003055901_01', '929003055901_02', '929003055901_03'],
        model: '929003055901',
        vendor: 'Philips',
        description: 'Hue white ambiance bathroom ceiling light Adore with Bluetooth',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['7602031N6'],
        model: '7602031N6',
        vendor: 'Philips',
        description: 'Hue Go portable light',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['7602031K6'],
        model: '7602031K6',
        vendor: 'Philips',
        description: 'Hue Go portable light',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['LLC020'],
        model: '7146060PH',
        vendor: 'Philips',
        description: 'Hue Go',
        extend: hueExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['LWA005'],
        model: '9290022411',
        vendor: 'Philips',
        description: 'Hue white single filament bulb A19 E26 with Bluetooth',
        extend: hueExtend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['LWE001'],
        model: '929002039801',
        vendor: 'Philips',
        description: 'Hue white E12 with Bluetooth',
        extend: hueExtend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['LTE001'],
        model: '9290022943',
        vendor: 'Philips',
        description: 'Hue white E12',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['LTE004'],
        model: '9290031451',
        vendor: 'Philips',
        description: 'Hue white ambiance filament E12 with Bluetooth',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['LWA007'],
        model: '929002277501',
        vendor: 'Philips',
        description: 'Hue white A19 bulb E26 with Bluetooth',
        extend: hueExtend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['LWA008'],
        model: '9290023351',
        vendor: 'Philips',
        description: 'Hue white A21 bulb E26 with Bluetooth (1600 Lumen)',
        extend: hueExtend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['LWA009'],
        model: '9290023349',
        vendor: 'Philips',
        description: 'Hue white A67 bulb E26 with Bluetooth (1600 Lumen)',
        extend: hueExtend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['LCT026', '7602031P7', '7602031U7', '7602031PU', '7602031J6'],
        model: '7602031P7',
        vendor: 'Philips',
        description: 'Hue Go with Bluetooth',
        extend: hueExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['LCF002', 'LCF001'],
        model: '8718696167991',
        vendor: 'Philips',
        description: 'Hue Calla outdoor',
        extend: hueExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['LCF005'],
        model: '8718696170557',
        vendor: 'Philips',
        description: 'Hue Calla outdoor',
        extend: hueExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['1742030P7'],
        model: '1742030P7',
        vendor: 'Philips',
        description: 'Hue Calla outdoor',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['929003098601'],
        model: '929003098601',
        vendor: 'Philips',
        description: 'Hue Calla outdoor Pedestal',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['1742330P7'],
        model: '1742330P7',
        vendor: 'Philips',
        description: 'Hue Calla outdoor',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['1743730P7'],
        model: '1743730P7',
        vendor: 'Philips',
        description: 'Hue Calla outdoor',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['1741930V7'],
        model: '1741930V7',
        vendor: 'Philips',
        description: 'Hue Calla outdoor',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['1744130P7'],
        model: '1744130P7',
        vendor: 'Philips',
        description: 'Hue Econic outdoor Pedestal',
        extend: hueExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['1745730V7'],
        model: '1745730V7',
        vendor: 'Philips',
        description: 'Hue Econic outdoor Pedestal',
        extend: hueExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['1743830V7'],
        model: '1743830V7',
        vendor: 'Philips',
        description: 'Hue Econic outdoor wall lamp',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['1743830P7'],
        model: '1743830P7',
        vendor: 'Philips',
        description: 'Hue Econic outdoor wall lamp',
        extend: hueExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['1743130P7'],
        model: '1743130P7',
        vendor: 'Philips',
        description: 'Hue Impress outdoor Pedestal',
        extend: hueExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['1743430P7'],
        model: '1743430P7',
        vendor: 'Philips',
        description: 'Hue Impress outdoor Pedestal',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['1740193P0'],
        model: '1740193P0',
        vendor: 'Philips',
        description: 'Hue White Lucca wall light',
        extend: hueExtend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['929003089301'],
        model: '929003089301',
        vendor: 'Philips',
        description: 'Hue White and Color Ambiance Lucca wall light',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['1740293P0'],
        model: '1740293P0',
        vendor: 'Philips',
        description: 'Hue Lucca Pedestal',
        extend: hueExtend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['1746630V7'],
        model: '1746630V7',
        vendor: 'Philips',
        description: 'Amarant linear outdoor light',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['LCC001'],
        model: '4090531P7',
        vendor: 'Philips',
        description: 'Hue Flourish white and color ambiance ceiling light',
        extend: hueExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['4090531P9', '929003053601', '929003053501'],
        model: '4090531P9',
        vendor: 'Philips',
        description: 'Hue Flourish white and color ambiance ceiling light with Bluetooth',
        extend: hueExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['4090431P9'],
        model: '4090431P9',
        vendor: 'Philips',
        description: 'Hue Flourish white and color ambiance table light with Bluetooth',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['929003052601'],
        model: '929003052601',
        vendor: 'Philips',
        description: 'Hue Flourish white and color ambiance table light with Bluetooth',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['LCG002', '929003047701', '929003047701'],
        model: '929001953101',
        vendor: 'Philips',
        description: 'Hue White and Color Ambiance GU10',
        extend: hueExtend.light_onoff_brightness_colortemp_color({
            colorTempRange: [153, 500], disableHueEffects: false,
        }),
    },
    {
        zigbeeModel: ['LWA003', 'LWW002'],
        model: '9290022268',
        vendor: 'Philips',
        description: 'Hue White A19 bulb with Bluetooth',
        extend: hueExtend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['LWO002'],
        model: '9290022415',
        vendor: 'Philips',
        description: 'Hue White G25 E26 Edison Filament Globe Bluetooth',
        extend: hueExtend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['LWA004'],
        model: '8718699688820',
        vendor: 'Philips',
        description: 'Hue Filament Standard A60/E27 bluetooth',
        extend: hueExtend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['LWA021'],
        model: '9290030514',
        vendor: 'Philips',
        description: 'Hue Filament Standard A60/E27 bluetooth',
        extend: hueExtend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['LCB001'],
        model: '548727',
        vendor: 'Philips',
        description: 'Hue White and Color Ambiance BR30 with bluetooth',
        extend: hueExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['LCB002'],
        model: '046677577957',
        vendor: 'Philips',
        description: 'Hue White and Color Ambiance BR30 with bluetooth',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['LWB004'],
        model: '433714',
        vendor: 'Philips',
        description: 'Hue Lux A19 bulb E27',
        extend: hueExtend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['LWB006', 'LWB014'],
        model: '9290011370',
        vendor: 'Philips',
        description: 'Hue white A60 bulb E27/B22',
        extend: hueExtend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['LDD001'],
        model: '8718696153055',
        vendor: 'Philips',
        description: 'Hue white table light',
        extend: hueExtend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['LDD002'],
        model: '8718696153062',
        vendor: 'Philips',
        description: 'Hue Muscari floor light',
        extend: hueExtend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['LWA001'],
        model: '8718699673147',
        vendor: 'Philips',
        description: 'Hue white A60 bulb E27 bluetooth',
        extend: hueExtend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['LWW003', 'LWF003'],
        model: '9290018216',
        vendor: 'Philips',
        description: 'Hue white A60 bulb E27 bluetooth',
        extend: hueExtend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['LWA011'],
        model: '929001821618',
        vendor: 'Philips',
        description: 'Hue white A60 bulb E27 bluetooth',
        extend: hueExtend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['LWA012'],
        model: '9290018217',
        vendor: 'Philips',
        description: 'Hue white A60 bulb B22 bluetooth',
        extend: hueExtend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['929003047001'],
        model: '929003047001',
        vendor: 'Philips',
        description: 'Hue White ambiance Milliskin (round)',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['LWA017'],
        model: '929002469202',
        vendor: 'Philips',
        description: 'Hue white A60 bulb E27 1050lm with Bluetooth',
        extend: hueExtend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['LWA002'],
        model: '9290018215',
        vendor: 'Philips',
        description: 'Hue white A19 bulb E26 bluetooth',
        extend: hueExtend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['LTA001', '4080130P6', '4300631P6'],
        model: '9290022169',
        vendor: 'Philips',
        description: 'Hue white ambiance E27 with Bluetooth',
        extend: hueExtend.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['LTA004'],
        model: '8719514328242',
        vendor: 'Philips',
        description: 'Hue white ambiance E27 800lm with Bluetooth',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['LTA009'],
        model: '9290024684',
        vendor: 'Philips',
        description: 'Hue white ambiance E27 1100lm with Bluetooth',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['LTA010'],
        model: '9290024683',
        vendor: 'Philips',
        description: 'Hue white ambiance A19 1100lm with Bluetooth',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['LTA011'],
        model: '929002471901',
        vendor: 'Philips',
        description: 'Hue white ambiance E27 1600lm with Bluetooth',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['LTA012'],
        model: '929002335105',
        vendor: 'Philips',
        description: 'Hue white ambiance E26 1600lm with Bluetooth',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['LTA008'],
        model: '9290022267A',
        vendor: 'Philips',
        description: 'Hue white ambiance E27 with Bluetooth',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 434]}),
    },
    {
        zigbeeModel: ['LCP003'],
        model: '4090631P7',
        vendor: 'Philips',
        description: 'Hue Flourish white and color ambiance pendant light',
        extend: hueExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['4090631P9'],
        model: '4090631P9',
        vendor: 'Philips',
        description: 'Hue Flourish white and color ambiance pendant light',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['LWB010'],
        model: '8718696449691',
        vendor: 'Philips',
        description: 'Hue White A60 Single bulb E27/B22',
        extend: hueExtend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['LWG001'],
        model: '9290018195',
        vendor: 'Philips',
        description: 'Hue white GU10',
        extend: hueExtend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['LWG003'],
        model: '9290019536',
        vendor: 'Philips',
        description: 'Hue white GU10',
        extend: hueExtend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['LWG004'],
        model: 'LWG004',
        vendor: 'Philips',
        description: 'Hue white GU10 bluetooth',
        extend: hueExtend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['LWO001'],
        model: '8718699688882',
        vendor: 'Philips',
        description: 'Hue white Filament bulb G93 E27 bluetooth',
        extend: hueExtend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['LST001'],
        model: '7299355PH',
        vendor: 'Philips',
        description: 'Hue white and color ambiance LightStrip',
        extend: hueExtend.light_onoff_brightness_color(),
    },
    {
        zigbeeModel: ['LST002'],
        model: '915005106701',
        vendor: 'Philips',
        description: 'Hue white and color ambiance LightStrip plus',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['LST003', 'LST004'],
        model: '9290018187B',
        vendor: 'Philips',
        description: 'Hue white and color ambiance LightStrip outdoor',
        extend: hueExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['LCL001', 'LCL006'],
        model: '8718699703424',
        vendor: 'Philips',
        description: 'Hue white and color ambiance LightStrip plus',
        extend: hueExtend.light_onoff_brightness_colortemp_color({disableHueEffects: false}),
    },
    {
        zigbeeModel: ['LCL002'],
        model: '9290022890',
        vendor: 'Philips',
        description: 'Hue white and color ambiance LightStrip outdoor 2m',
        extend: hueExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['LCA001', 'LCA002', 'LCA003'],
        model: '9290022166',
        vendor: 'Philips',
        description: 'Hue white and color ambiance E26/E27',
        extend: hueExtend.light_onoff_brightness_colortemp_color({disableHueEffects: false, colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['LCA004'],
        model: '9290024896',
        vendor: 'Philips',
        description: 'Hue white and color ambiance E27',
        extend: hueExtend.light_onoff_brightness_colortemp_color({disableHueEffects: false, colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['LCA006'],
        model: '9290024689',
        vendor: 'Philips',
        description: 'Hue white and color ambiance B22 1100lm',
        extend: hueExtend.light_onoff_brightness_colortemp_color({disableHueEffects: false, colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['LCA008'],
        model: '929002471601',
        vendor: 'Philips',
        description: 'Hue white and color ambiance E26/E27 1600lm',
        extend: hueExtend.light_onoff_brightness_colortemp_color({
            colorTempRange: [153, 500], disableHueEffects: false,
        }),
    },
    {
        zigbeeModel: ['LCA009'],
        model: '9290024717',
        vendor: 'Philips',
        description: 'Hue white and color ambiance E26/A19 1600lm',
        extend: hueExtend.light_onoff_brightness_colortemp_color({disableHueEffects: false, colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['LCT001', 'LCT007', 'LCT010', 'LCT012', 'LCT014', 'LCT015', 'LCT016', 'LCT021'],
        model: '9290012573A',
        vendor: 'Philips',
        description: 'Hue white and color ambiance E26/E27/E14',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['1743930P7', '1744030P7', '1744030V7'],
        model: '1743930P7',
        vendor: 'Philips',
        description: 'Hue Outdoor Econic wall lantern',
        extend: hueExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['929003053001'],
        model: '929003053001',
        vendor: 'Philips',
        description: 'Hue Sana wall light (white)',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['929003052901'],
        model: '929003052901',
        vendor: 'Philips',
        description: 'Hue Sana wall light (black)',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['LCE001'],
        model: '929002294101',
        vendor: 'Philips',
        description: 'Hue White and Color Ambiance E12 with bluetooth',
        extend: hueExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['LCE002'],
        model: '929002294203',
        vendor: 'Philips',
        description: 'Hue White and Color Ambiance E14 with bluetooth',
        extend: hueExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['LCT002', 'LCT011'],
        model: '9290002579A',
        vendor: 'Philips',
        description: 'Hue white and color ambiance BR30',
        extend: hueExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['LWB022'],
        model: '9290018194',
        vendor: 'Philips',
        description: 'Hue white BR30',
        extend: hueExtend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['LCT003'],
        model: '8718696485880',
        vendor: 'Philips',
        description: 'Hue white and color ambiance GU10',
        extend: hueExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['LCT024', '440400982841', '440400982842'],
        model: '915005733701',
        vendor: 'Philips',
        description: 'Hue White and color ambiance Play Lightbar',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['LTW011', 'LTB002'],
        model: '464800',
        vendor: 'Philips',
        description: 'Hue white ambiance BR30 flood light',
        extend: hueExtend.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['LTW012'],
        model: '8718696695203',
        vendor: 'Philips',
        description: 'Hue white ambiance E14',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['LTE002'],
        model: '9290022944',
        vendor: 'Philips',
        description: 'Hue white ambiance E14 (with Bluetooth)',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['LWE002'],
        model: '9290020399',
        vendor: 'Philips',
        description: 'Hue white E14',
        extend: hueExtend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['LTW013'],
        model: '8718696598283',
        vendor: 'Philips',
        description: 'Hue white ambiance GU10',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['LTG002'],
        model: '929001953301',
        vendor: 'Philips',
        description: 'Hue white ambiance GU10 with Bluetooth',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454], disableHueEffects: false}),
    },
    {
        zigbeeModel: ['LTD005'],
        model: '5995111U5',
        vendor: 'Philips',
        description: 'Hue white ambiance 5/6" retrofit recessed downlight',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['LTG001'],
        model: '9290019534',
        vendor: 'Philips',
        description: 'Hue white ambiance GU10 with Bluetooth',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['3417831P6', '929003056101'],
        model: '3417831P6',
        vendor: 'Philips',
        description: 'Hue white ambiance Adore spotlight with Bluetooth (1 spot)',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['3418131P6', '929003056401'],
        model: '3418131P6',
        vendor: 'Philips',
        description: 'Hue white ambiance Adore GU10 with Bluetooth (3 spots)',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['3417931P6', '929003056201'],
        model: '3417931P6',
        vendor: 'Philips',
        description: 'Hue white ambiance Adore GU10 with Bluetooth (2 spots)',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['3417711P6'],
        model: '3417711P6',
        vendor: 'Philips',
        description: 'Hue white ambiance Adore wall light',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['929003056001'],
        model: '929003056001',
        vendor: 'Philips',
        description: 'Hue white ambiance Adore bathroom mirror light with Bluetooth',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['LTW015'],
        model: '9290011998B',
        vendor: 'Philips',
        description: 'Hue white ambiance E26',
        extend: hueExtend.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['LTA002'],
        model: '9290022167',
        vendor: 'Philips',
        description: 'Hue white ambiance E26 with Bluetooth',
        extend: hueExtend.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['LTA003'],
        model: '9290022267',
        vendor: 'Philips',
        description: 'Hue white ambiance E26 with Bluetooth',
        extend: hueExtend.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['LTO003'],
        model: '9290024782',
        vendor: 'Philips',
        description: 'Hue G125 B22 White Ambiance filament bulb',
        extend: hueExtend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['LTW010', 'LTW001', 'LTW004'],
        model: '8718696548738',
        vendor: 'Philips',
        description: 'Hue white ambiance E26/E27',
        extend: hueExtend.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['LTW017'],
        model: '915005587401',
        vendor: 'Philips',
        description: 'Hue white ambiance Adore light',
        extend: hueExtend.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['3402831P7'],
        model: '3402831P7',
        vendor: 'Philips',
        description: 'Hue white ambiance bathroom mirror light Adore',
        extend: hueExtend.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['3418411P6'],
        model: '3418411P6',
        vendor: 'Philips',
        description: 'Hue white ambiance bathroom ceiling light Adore with Bluetooth',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['LTC021'],
        model: '3435011P7',
        vendor: 'Philips',
        description: 'Hue white ambiance bathroom ceiling light Adore',
        extend: hueExtend.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['4503748C6'],
        model: '4503748C6',
        vendor: 'Philips',
        description: 'Hue white ambiance Muscari ceiling light',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['LTD003'],
        model: '4503848C5',
        vendor: 'Philips',
        description: 'Hue white ambiance Muscari pendant light',
        extend: hueExtend.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['LTD004'],
        model: '801480',
        vendor: 'Philips',
        description: 'Hue white ambiance 4" retrofit recessed downlight',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['LTD009'],
        model: '5996311U5',
        vendor: 'Philips',
        description: 'Hue white ambiance 4" retrofit recessed downlight',
        extend: hueExtend.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['LTD010'],
        model: '5996411U5',
        vendor: 'Philips',
        description: 'Hue white ambiance 5/6" retrofit recessed downlight',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['LCD001'],
        model: '5996511U5',
        vendor: 'Philips',
        description: 'Hue white and color ambiance 4" retrofit recessed downlight',
        extend: hueExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['LCD002'],
        model: '5996611U5',
        vendor: 'Philips',
        description: 'Hue white and color ambiance 5/6" retrofit recessed downlight',
        extend: hueExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['LCW001'],
        model: '4090130P7',
        vendor: 'Philips',
        description: 'Hue Sana',
        extend: hueExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['4090130P9'],
        model: '4090130P9',
        vendor: 'Philips',
        description: 'Hue Sana',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['LCW002', '4090230P9', '929003053101'],
        model: '4090230P9',
        vendor: 'Philips',
        description: 'Hue Liane (black)',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500], disableHueEffects: false}),
    },
    {
        zigbeeModel: ['929003053201'],
        model: '929003053201',
        vendor: 'Philips',
        description: 'Hue Liane (white)',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['4090231P9'],
        model: '4090231P9',
        vendor: 'Philips',
        description: 'Hue Liane',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['LTC001'],
        model: '3261030P7',
        vendor: 'Philips',
        description: 'Hue Being',
        extend: hueExtend.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['3261030P6'],
        model: '3261030P6',
        vendor: 'Philips',
        description: 'Hue Being black',
        extend: hueExtend.light_onoff_brightness_colortemp({disableHueEffects: false}),
    },
    {
        zigbeeModel: ['3261031P6', '929003055001', '929003055101'],
        model: '3261031P6',
        vendor: 'Philips',
        description: 'Hue Being white',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454], disableHueEffects: false}),
    },
    {
        zigbeeModel: ['3261048P6'],
        model: '3261048P6',
        vendor: 'Philips',
        description: 'Hue Being aluminium',
        extend: hueExtend.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['3216431P6'],
        model: '3216431P6',
        vendor: 'Philips',
        description: 'Hue Aurelle',
        extend: hueExtend.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['LTP007'],
        model: '4505748C5',
        vendor: 'Philips',
        description: 'Hue Ambiance Pendant',
        extend: hueExtend.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['LTP008'],
        model: '4098430P7',
        vendor: 'Philips',
        description: 'Hue Being Pendant',
        extend: hueExtend.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['LTP011'],
        model: '4507748C5',
        vendor: 'Philips',
        description: 'Hue Semeru Ambiance Pendant',
        extend: hueExtend.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['3261348P6'],
        model: '3261348P6',
        vendor: 'Philips',
        description: 'Hue white ambiance Still',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['3261331P6', '929003055301'],
        model: '3261331P6',
        vendor: 'Philips',
        description: 'Hue white ambiance Still (white)',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['929003054101'],
        model: '929003054101',
        vendor: 'Philips',
        description: 'Hue Wellner white ambiance E27 806lm with Bluetooth',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['3261330P6'],
        model: '3261330P6',
        vendor: 'Philips',
        description: 'Hue white ambiance Still',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['929003055401'],
        model: '929003055401',
        vendor: 'Philips',
        description: 'Hue white ambiance Still (aluminium)',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['929003055501'],
        model: '929003055501',
        vendor: 'Philips',
        description: 'Hue white ambiance Still (black)',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['LTC003'],
        model: '3261331P7',
        vendor: 'Philips',
        description: 'Hue white ambiance Still',
        extend: hueExtend.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['LTC011'],
        model: '4096730U7',
        vendor: 'Philips',
        description: 'Hue Cher ceiling light',
        extend: hueExtend.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['4096730P6', '929003055601'],
        model: '4096730P6',
        vendor: 'Philips',
        description: 'Hue Cher ceiling light',
        extend: hueExtend.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['4096730U9'],
        model: '046677803087',
        vendor: 'Philips',
        description: 'Hue White ambiance Cher ceiling light',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['LTC013'],
        model: '3216131P5',
        vendor: 'Philips',
        description: 'Hue white ambiance Aurelle square panel light',
        extend: hueExtend.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['3216131P6', 'LTC005'],
        model: '3216131P6',
        vendor: 'Philips',
        description: 'Hue white ambiance Aurelle square panel light',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['3216231P6'],
        model: '3216231P6',
        vendor: 'Philips',
        description: 'Hue white ambiance Aurelle square panel light',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['929003099001', '929003099201'],
        model: '929003099001',
        vendor: 'Philips',
        description: 'Hue white ambiance Aurelle square panel light',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['LTC015'],
        model: '3216331P5',
        vendor: 'Philips',
        description: 'Hue white ambiance Aurelle rectangle panel light',
        extend: hueExtend.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['3216331P6'],
        model: '3216331P6',
        vendor: 'Philips',
        description: 'Hue white ambiance Aurelle rectangle panel light',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['929003099101'],
        model: '929003099101',
        vendor: 'Philips',
        description: 'Hue white ambiance Aurelle rectangle panel light',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['LTC016'],
        model: '3216431P5',
        vendor: 'Philips',
        description: 'Hue white ambiance Aurelle round panel light',
        extend: hueExtend.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['4033930P6'],
        model: '4033930P6',
        vendor: 'Philips',
        description: 'Hue white ambiance suspension Fair',
        extend: hueExtend.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['LTP003', 'LTP001'],
        model: '4033930P7',
        vendor: 'Philips',
        description: 'Hue white ambiance suspension Fair',
        extend: hueExtend.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['LTP002', '929003054901'],
        model: '4023330P7',
        vendor: 'Philips',
        description: 'Hue white ambiance suspension Amaze',
        extend: hueExtend.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['4023330P6'],
        model: '4023330P6',
        vendor: 'Philips',
        description: 'Hue white ambiance suspension Amaze',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['4023331P6'],
        model: '4023331P6',
        vendor: 'Philips',
        description: 'Hue white ambiance Amaze',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['929003054801'],
        model: '929003054801',
        vendor: 'Philips',
        description: 'Hue white ambiance suspension Amaze with Bluetooth',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['LWF001', 'LWF002', 'LWW001'],
        model: '9290011370B',
        vendor: 'Philips',
        description: 'Hue white A60 bulb E27',
        extend: hueExtend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['LWB015'],
        model: '046677476816',
        vendor: 'Philips',
        description: 'Hue white PAR38 outdoor',
        extend: hueExtend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['LWS001'],
        model: '9290018189',
        vendor: 'Philips',
        description: 'Hue white PAR38 outdoor',
        extend: hueExtend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['LLC010'],
        model: '7199960PH',
        vendor: 'Philips',
        description: 'Hue Iris',
        extend: hueExtend.light_onoff_brightness_color(),
    },
    {
        zigbeeModel: ['929002376101'],
        model: '929002376101',
        vendor: 'Philips',
        description: 'Hue Iris (generation 2, white)',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['929002376201'],
        model: '929002376201',
        vendor: 'Philips',
        description: 'Hue Iris (generation 2, black)',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['929002376801'],
        model: '929002376801',
        vendor: 'Philips',
        description: 'Hue Iris kobber limited edition (generation 4)',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['929002376701'],
        model: '929002376701',
        vendor: 'Philips',
        description: 'Hue Iris silver limited edition (generation 4) ',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['929002376703'],
        model: '929002376703',
        vendor: 'Philips',
        description: 'Hue Iris silver special edition (generation 4) ',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['929002376401'],
        model: '929002376401',
        vendor: 'Philips',
        description: 'Hue Iris gold limited edition (generation 4) ',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['1742930P7'],
        model: '1742930P7',
        vendor: 'Philips',
        description: 'Hue outdoor Impress wall lamp',
        extend: hueExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['1743030P7'],
        model: '1743030P7',
        vendor: 'Philips',
        description: 'Hue outdoor Impress wall lamp',
        extend: hueExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['1745930P7'],
        model: '1745930P7',
        vendor: 'Philips',
        description: 'Hue outdoor Impress wall lamp (low voltage)',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['1743230P7'],
        model: '1743230P7',
        vendor: 'Philips',
        description: 'Hue outdoor Impress lantern',
        extend: hueExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['1746430P7', '929003098701'],
        model: '1746430P7',
        vendor: 'Philips',
        description: 'Hue outdoor Resonate wall lamp (black)',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['1746447P7'],
        model: '1746447P7',
        vendor: 'Philips',
        description: 'Hue outdoor Resonate wall lamp (silver)',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['LLC006'],
        model: '7099930PH',
        vendor: 'Philips',
        description: 'Hue Iris (Generation 2)',
        extend: hueExtend.light_onoff_brightness_color(),
    },
    {
        zigbeeModel: ['4080248P9'],
        model: '4080248P9',
        vendor: 'Philips',
        description: 'Hue Signe floor light',
        extend: hueExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['LCF003', '4080248P7'],
        model: '4080248P7',
        vendor: 'Philips',
        description: 'Hue Signe floor light',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['4080248U9', '915005987201'],
        model: '4080248U9',
        vendor: 'Philips',
        description: 'Hue White and color ambiance Signe floor light',
        extend: hueExtend.light_onoff_brightness_colortemp_color_gradient({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['915005987601'],
        model: '915005987601',
        vendor: 'Philips',
        description: 'Hue Gradient Signe floor lamp (black)',
        extend: hueExtend.light_onoff_brightness_colortemp_color_gradient({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['915005987501'],
        model: '915005987501',
        vendor: 'Philips',
        description: 'Hue Gradient Signe floor lamp (white)',
        extend: hueExtend.light_onoff_brightness_colortemp_color_gradient({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['915005987701'],
        model: '915005987701',
        vendor: 'Philips',
        description: 'Hue Gradient Signe floor lamp (wood)',
        extend: hueExtend.light_onoff_brightness_colortemp_color_gradient({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['LCT020'],
        model: '4080148P7',
        vendor: 'Philips',
        description: 'Hue Signe table light',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['4080148P9'],
        model: '4080148P9',
        vendor: 'Philips',
        description: 'Hue Signe table light',
        extend: hueExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['4080148U9'],
        model: '4080148U9',
        vendor: 'Philips',
        description: 'Hue White and color ambiance Signe table light',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['915005986901'],
        model: '915005986901',
        vendor: 'Philips',
        description: 'Hue White and color ambiance Gradient Signe table lamp (white)',
        extend: hueExtend.light_onoff_brightness_colortemp_color_gradient({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['915005987001'],
        model: '915005987001',
        vendor: 'Philips',
        description: 'Hue White and color ambiance Gradient Signe table lamp (black)',
        extend: hueExtend.light_onoff_brightness_colortemp_color_gradient({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['5060730P7_01', '5060730P7_02', '5060730P7_03', '5060730P7_04', '5060730P7_05'],
        model: '5060730P7',
        vendor: 'Philips',
        description: 'Hue White & Color ambience Centris ceiling light (4 spots)',
        extend: hueExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['5060731P7_01', '5060731P7_02', '5060731P7_03', '5060731P7_04', '5060731P7_05'],
        model: '5060731P7',
        vendor: 'Philips',
        description: 'Hue White & Color ambience Centris ceiling light (4 spots)',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['5060830P7_01', '5060830P7_02', '5060830P7_03', '5060830P7_04'],
        model: '5060830P7',
        vendor: 'Philips',
        description: 'Hue White & Color ambience Centris ceiling light (3 spots)',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['5060831P7_01', '5060831P7_02', '5060831P7_03', '5060831P7_04'],
        model: '5060831P7',
        vendor: 'Philips',
        description: 'Hue White & Color ambience Centris ceiling light (3 spots)',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['5061031P7_01', '5061031P7_02', '5061031P7_03'],
        model: '5061031P7',
        vendor: 'Philips',
        description: 'Hue White & Color ambience Centris ceiling light (2 spots) (white)',
        extend: hueExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['5061030P7_01', '5061030P7_02', '5061030P7_03'],
        model: '5061030P7',
        vendor: 'Philips',
        description: 'Hue White & Color ambience Centris ceiling light (2 spots) (black)',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['5062131P7'],
        model: '5062131P7',
        vendor: 'Philips',
        description: 'Hue white and color ambience Argenta spot white (1 spot)',
        extend: hueExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['5062148P7'],
        model: '5062148P7',
        vendor: 'Philips',
        description: 'Hue white and color ambience Argenta spot aluminium (1 spot)',
        extend: hueExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['5062231P7'],
        model: '5062231P7',
        vendor: 'Philips',
        description: 'Hue white and color ambience Argenta spot white (2 spots)',
        extend: hueExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['5062248P7'],
        model: '5062248P7',
        vendor: 'Philips',
        description: 'Hue white and color ambience Argenta spot aluminium (2 spots)',
        extend: hueExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['5062331P7'],
        model: '5062331P7',
        vendor: 'Philips',
        description: 'Hue white and color ambience Argenta spot white (3 spots)',
        extend: hueExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['5062348P7'],
        model: '5062348P7',
        vendor: 'Philips',
        description: 'Hue white and color ambience Argenta spot aluminium (3 spots)',
        extend: hueExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['5062431P7'],
        model: '5062431P7',
        vendor: 'Philips',
        description: 'Hue white and color ambience Argenta spot white (4 spots)',
        extend: hueExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['5062448P7'],
        model: '5062448P7',
        vendor: 'Philips',
        description: 'Hue white and color ambience Argenta spot aluminium (4 spots)',
        extend: hueExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['5063231P7'],
        model: '5063231P7',
        vendor: 'Philips',
        description: 'Hue Bluetooth white & color ambiance spot Fugato white (2 spots)',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['5063230P7'],
        model: '5063230P7',
        vendor: 'Philips',
        description: 'Hue Bluetooth white & color ambiance spot Fugato black (2 spots)',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['5063331P7'],
        model: '5063331P7',
        vendor: 'Philips',
        description: 'Hue Bluetooth white & color ambiance spot Fugato white (3 spots)',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['5063330P7'],
        model: '5063330P7',
        vendor: 'Philips',
        description: 'Hue Bluetooth white & color ambiance spot Fugato black (3 spots)',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['5063431P7'],
        model: '5063431P7',
        vendor: 'Philips',
        description: 'Hue Bluetooth White & Color Ambiance spot Fugato white (4 spots)',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['5063430P7'],
        model: '5063430P7',
        vendor: 'Philips',
        description: 'Hue Bluetooth White & Color Ambiance spot Fugato black (4 spots)',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['5045131P7'],
        model: '5045131P7',
        vendor: 'Philips',
        description: 'Hue Centura',
        extend: hueExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['5045148P7'],
        model: '5045148P7',
        vendor: 'Philips',
        description: 'Hue Centura',
        extend: hueExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['5055148P7'],
        model: '5055148P7',
        vendor: 'Philips',
        description: 'Hue Centura Aluminium (square)',
        extend: hueExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['5055131P7'],
        model: '5055131P7',
        vendor: 'Philips',
        description: 'Hue Centura White (square)',
        extend: hueExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['RDM001', '9290030171'],
        model: '929003017102',
        vendor: 'Philips',
        description: 'Hue wall switch module',
        fromZigbee: [fz.battery, fz.hue_wall_switch_device_mode, fz.hue_wall_switch],
        exposes: [
            e.battery(), e.action(['left_press', 'left_press_release', 'right_press', 'right_press_release',
                'left_hold', 'left_hold_release', 'right_hold', 'right_hold_release']),
            exposes.enum('device_mode', ea.ALL, ['single_rocker', 'single_push_button', 'dual_rocker', 'dual_push_button'])],
        toZigbee: [tz.hue_wall_switch_device_mode],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'genOnOff', 'manuSpecificPhilips']);
            await reporting.batteryPercentageRemaining(endpoint);
            const options = {manufacturerCode: 0x100B, disableDefaultResponse: true};
            await endpoint.write('genBasic', {0x0034: {value: 0, type: 48}}, options);
        },
    },
    {
        zigbeeModel: ['RWL020', 'RWL021'],
        model: '324131092621',
        vendor: 'Philips',
        description: 'Hue dimmer switch',
        fromZigbee: [fz.ignore_command_on, fz.ignore_command_off, fz.ignore_command_step, fz.ignore_command_stop,
            fz.legacy.hue_dimmer_switch, fz.battery],
        exposes: [e.battery(), e.action(['on_press', 'on_hold', 'on_hold_release', 'up_press', 'up_hold', 'up_hold_release',
            'down_press', 'down_hold', 'down_hold_release', 'off_press', 'off_hold', 'off_hold_release']),
        exposes.numeric('action_duration', ea.STATE).withUnit('second')],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            await reporting.bind(endpoint1, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);

            const endpoint2 = device.getEndpoint(2);
            const options = {manufacturerCode: 0x100B, disableDefaultResponse: true};
            await endpoint2.write('genBasic', {0x0031: {value: 0x000B, type: 0x19}}, options);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['manuSpecificPhilips', 'genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint2);
        },
        endpoint: (device) => {
            return {'ep1': 1, 'ep2': 2};
        },
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['RWL022'],
        model: '929002398602',
        vendor: 'Philips',
        description: 'Hue dimmer switch',
        fromZigbee: [fz.ignore_command_on, fz.ignore_command_off, fz.ignore_command_step, fz.ignore_command_stop,
            fz.hue_dimmer_switch, fz.battery, fz.command_recall],
        exposes: [e.battery(), e.action(['on_press', 'on_hold', 'on_press_release', 'on_hold_release',
            'off_press', 'off_hold', 'off_press_release', 'off_hold_release', 'up_press', 'up_hold', 'up_press_release', 'up_hold_release',
            'down_press', 'down_hold', 'down_press_release', 'down_hold_release', 'recall_0', 'recall_1'])],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl', 'manuSpecificPhilips', 'genPowerCfg']);
            const options = {manufacturerCode: 0x100B, disableDefaultResponse: true};
            await endpoint.write('genBasic', {0x0031: {value: 0x000B, type: 0x19}}, options);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['ROM001'],
        model: '8718699693985',
        vendor: 'Philips',
        description: 'Hue smart button',
        fromZigbee: [fz.command_on, fz.command_off_with_effect, fz.legacy.SmartButton_skip, fz.hue_smart_button_event, fz.battery],
        toZigbee: [],
        exposes: [e.battery(), e.action(['on', 'off', 'skip_backward', 'skip_forward', 'press', 'hold', 'release'])],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);

            const options = {manufacturerCode: 0x100B, disableDefaultResponse: true};
            await endpoint.write('genBasic', {0x0031: {value: 0x000B, type: 0x19}}, options);
            await reporting.bind(endpoint, coordinatorEndpoint, ['manuSpecificPhilips', 'genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['SML001'],
        model: '9290012607',
        vendor: 'Philips',
        description: 'Hue motion sensor',
        fromZigbee: [fz.battery, fz.occupancy, fz.temperature, fz.occupancy_timeout, fz.illuminance,
            fz.hue_motion_sensitivity, fz.hue_motion_led_indication],
        exposes: [e.temperature(), e.occupancy(), e.battery(), e.illuminance_lux(), e.illuminance(),
            exposes.enum('motion_sensitivity', ea.ALL, ['low', 'medium', 'high']),
            exposes.binary('led_indication', ea.ALL, true, false).withDescription('Blink green LED on motion detection'),
            exposes.numeric('occupancy_timeout', ea.ALL).withUnit('second').withValueMin(0).withValueMax(65535)],
        toZigbee: [tz.occupancy_timeout, tzLocal.hue_motion_sensitivity, tzLocal.hue_motion_led_indication],
        endpoint: (device) => {
            return {'default': 2, 'ep1': 1, 'ep2': 2};
        },
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(2);
            const binds = ['genPowerCfg', 'msIlluminanceMeasurement', 'msTemperatureMeasurement', 'msOccupancySensing'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.occupancy(endpoint);
            await reporting.temperature(endpoint);
            await reporting.illuminance(endpoint);
            // read occupancy_timeout and motion_sensitivity
            await endpoint.read('msOccupancySensing', ['pirOToUDelay']);
            await endpoint.read('msOccupancySensing', [48], {manufacturerCode: 4107});
        },
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['SML002'],
        model: '9290019758',
        vendor: 'Philips',
        description: 'Hue motion outdoor sensor',
        fromZigbee: [fz.battery, fz.occupancy, fz.temperature, fz.illuminance, fz.occupancy_timeout,
            fz.hue_motion_sensitivity, fz.hue_motion_led_indication],
        exposes: [e.temperature(), e.occupancy(), e.battery(), e.illuminance_lux(), e.illuminance(),
            exposes.enum('motion_sensitivity', ea.ALL, ['low', 'medium', 'high']),
            exposes.binary('led_indication', ea.ALL, true, false).withDescription('Blink green LED on motion detection'),
            exposes.numeric('occupancy_timeout', ea.ALL).withUnit('second').withValueMin(0).withValueMax(65535)],
        toZigbee: [tz.occupancy_timeout, tzLocal.hue_motion_sensitivity, tzLocal.hue_motion_led_indication],
        endpoint: (device) => {
            return {'default': 2, 'ep1': 1, 'ep2': 2};
        },
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(2);
            const binds = ['genPowerCfg', 'msIlluminanceMeasurement', 'msTemperatureMeasurement', 'msOccupancySensing'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.occupancy(endpoint);
            await reporting.temperature(endpoint);
            await reporting.illuminance(endpoint);
            // read occupancy_timeout and motion_sensitivity
            await endpoint.read('msOccupancySensing', ['pirOToUDelay']);
            await endpoint.read('msOccupancySensing', [48], {manufacturerCode: 4107});
        },
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['SML003'],
        model: '9290030675',
        vendor: 'Philips',
        description: 'Hue motion sensor',
        fromZigbee: [fz.battery, fz.occupancy, fz.temperature, fz.occupancy_timeout, fz.illuminance,
            fz.hue_motion_sensitivity, fz.hue_motion_led_indication],
        exposes: [e.temperature(), e.occupancy(), e.battery(), e.illuminance_lux(), e.illuminance(),
            exposes.enum('motion_sensitivity', ea.ALL, ['low', 'medium', 'high', 'very_high', 'max']),
            exposes.binary('led_indication', ea.ALL, true, false).withDescription('Blink green LED on motion detection'),
            exposes.numeric('occupancy_timeout', ea.ALL).withUnit('second').withValueMin(0).withValueMax(65535)],
        toZigbee: [tz.occupancy_timeout, tzLocal.hue_motion_sensitivity, tzLocal.hue_motion_led_indication],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(2);
            const binds = ['genPowerCfg', 'msIlluminanceMeasurement', 'msTemperatureMeasurement', 'msOccupancySensing'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.occupancy(endpoint);
            await reporting.temperature(endpoint);
            await reporting.illuminance(endpoint);
            // read occupancy_timeout and motion_sensitivity
            await endpoint.read('msOccupancySensing', ['pirOToUDelay']);
            await endpoint.read('msOccupancySensing', [48], {manufacturerCode: 4107});
        },
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['SML004'],
        model: '9290030674',
        vendor: 'Philips',
        description: 'Hue motion outdoor sensor',
        fromZigbee: [fz.battery, fz.occupancy, fz.temperature, fz.illuminance, fz.occupancy_timeout,
            fz.hue_motion_sensitivity, fz.hue_motion_led_indication],
        exposes: [e.temperature(), e.occupancy(), e.battery(), e.illuminance_lux(), e.illuminance(),
            exposes.enum('motion_sensitivity', ea.ALL, ['low', 'medium', 'high', 'very_high', 'max']),
            exposes.binary('led_indication', ea.ALL, true, false).withDescription('Blink green LED on motion detection'),
            exposes.numeric('occupancy_timeout', ea.ALL).withUnit('second').withValueMin(0).withValueMax(65535)],
        toZigbee: [tz.occupancy_timeout, tzLocal.hue_motion_sensitivity, tzLocal.hue_motion_led_indication],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(2);
            const binds = ['genPowerCfg', 'msIlluminanceMeasurement', 'msTemperatureMeasurement', 'msOccupancySensing'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.occupancy(endpoint);
            await reporting.temperature(endpoint);
            await reporting.illuminance(endpoint);
            // read occupancy_timeout and motion_sensitivity
            await endpoint.read('msOccupancySensing', ['pirOToUDelay']);
            await endpoint.read('msOccupancySensing', [48], {manufacturerCode: 4107});
        },
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LOM001'],
        model: '929002240401',
        vendor: 'Philips',
        description: 'Hue smart plug - EU',
        extend: extend.switch({disablePowerOnBehavior: true}),
        toZigbee: [tz.on_off].concat([tzLocal.hue_power_on_behavior, tzLocal.hue_power_on_error]),
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(11);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LOM002', 'LOM004', 'LOM010'],
        model: '046677552343',
        vendor: 'Philips',
        description: 'Hue smart plug bluetooth',
        extend: extend.switch({disablePowerOnBehavior: true}),
        toZigbee: [tz.on_off].concat([tzLocal.hue_power_on_behavior, tzLocal.hue_power_on_error]),
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(11);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LOM003', 'LOM009'],
        model: '8718699689308',
        vendor: 'Philips',
        description: 'Hue smart plug - UK',
        extend: extend.switch({disablePowerOnBehavior: true}),
        toZigbee: [tz.on_off].concat([tzLocal.hue_power_on_behavior, tzLocal.hue_power_on_error]),
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(11);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LOM005'],
        model: '9290022408',
        vendor: 'Philips',
        description: 'Hue smart plug - AU',
        extend: extend.switch({disablePowerOnBehavior: true}),
        toZigbee: [tz.on_off].concat([tzLocal.hue_power_on_behavior, tzLocal.hue_power_on_error]),
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(11);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LOM011'],
        model: '8719514342361',
        vendor: 'Philips',
        description: 'Hue smart plug - AU',
        extend: extend.switch({disablePowerOnBehavior: true}),
        toZigbee: [tz.on_off].concat([tzLocal.hue_power_on_behavior, tzLocal.hue_power_on_error]),
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(11);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LOM006'],
        model: '9290024426',
        vendor: 'Philips',
        description: 'Hue smart plug - CH',
        extend: extend.switch({disablePowerOnBehavior: true}),
        toZigbee: [tz.on_off].concat([tzLocal.hue_power_on_behavior, tzLocal.hue_power_on_error]),
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(11);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LOM007'],
        model: '929003050601',
        vendor: 'Philips',
        description: 'Hue smart plug',
        extend: extend.switch({disablePowerOnBehavior: true}),
        toZigbee: [tz.on_off].concat([tzLocal.hue_power_on_behavior, tzLocal.hue_power_on_error]),
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(11);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LOM008'],
        model: '9290030509',
        vendor: 'Philips',
        description: 'Hue smart plug - EU',
        extend: extend.switch({disablePowerOnBehavior: true}),
        toZigbee: [tz.on_off].concat([tzLocal.hue_power_on_behavior, tzLocal.hue_power_on_error]),
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(11);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LLC014'],
        model: '7099860PH',
        vendor: 'Philips',
        description: 'LivingColors Aura',
        extend: hueExtend.light_onoff_brightness_color(),
    },
    {
        zigbeeModel: ['LTC014'],
        model: '3216231P5',
        vendor: 'Philips',
        description: 'Hue white ambiance Aurelle rectangle panel light',
        extend: hueExtend.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['1744830P7'],
        model: '8718696170656',
        vendor: 'Philips',
        description: 'Hue White Fuzo outdoor floor light',
        extend: hueExtend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['929003098901'],
        model: '929003098901',
        vendor: 'Philips',
        description: 'Hue White Inara outdoor light',
        extend: hueExtend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['1744530P7', '1744630P7', '1744430P7', '1744730P7'],
        model: '8718696170625',
        vendor: 'Philips',
        description: 'Hue Fuzo outdoor wall light',
        extend: hueExtend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['929003055201'],
        model: '929003055201',
        vendor: 'Philips',
        description: 'Hue Being',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['4100448U9'],
        model: '4100448U9',
        vendor: 'Philips',
        description: 'Hue Being',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['1743630P7', '1743630V7'],
        model: '17436/30/P7',
        vendor: 'Philips',
        description: 'Hue Welcome white flood light',
        extend: hueExtend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['1743530P7', '1743530V7'],
        model: '17435/30/P7',
        vendor: 'Philips',
        description: 'Hue Discover white and color ambiance flood light',
        extend: hueExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['1746330P7', '1746330V7', '1746347P7'],
        model: '1746330P7',
        vendor: 'Philips',
        description: 'Hue Appear outdoor wall light',
        extend: hueExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['LCS001', '1741830P7'],
        model: '1741830P7',
        vendor: 'Philips',
        description: 'Hue Lily outdoor spot light',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['1742730P7', '1742830P7'],
        model: '1742830P7',
        vendor: 'Philips',
        description: 'Hue Lily outdoor spot light',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['1741530P7', '1741430P7'],
        model: '1741530P7',
        vendor: 'Philips',
        description: 'Hue Lily outdoor spot light',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500], disableHueEffects: false}),
    },
    {
        zigbeeModel: ['1741730V7'],
        model: '1741730V7',
        vendor: 'Philips',
        description: 'Hue Lily outdoor spot light',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['1746730V7'],
        model: '1746730V7',
        vendor: 'Philips',
        description: 'Hue Lily outdoor spot light',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['1746230V7', '1746230P7'],
        model: '1746230V7',
        vendor: 'Philips',
        description: 'Hue Lily XL outdoor spot light',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['LCL003'],
        model: '9290022891',
        vendor: 'Philips',
        description: 'Hue Lily outdoor led strip',
        extend: hueExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['LWV001'],
        model: '929002241201',
        vendor: 'Philips',
        description: 'Hue white filament Edison E27 LED',
        extend: hueExtend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['LTV002'],
        model: '929002477901',
        vendor: 'Philips',
        description: 'Hue white filament Edison ST72 E27 LED warm-to-cool',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [222, 454]}),
    },
    {
        zigbeeModel: ['LTV004'],
        model: '929002478401',
        vendor: 'Philips',
        description: 'Hue white filament Edison ST19 E26 LED warm-to-cool',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [222, 454]}),
    },
    {
        zigbeeModel: ['LTO004'],
        model: '9290024785',
        vendor: 'Philips',
        description: 'Hue White Ambinance G25 E26 Edison Filament Globe',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [222, 454]}),
    },
    {
        zigbeeModel: ['LWE005'],
        model: '9290024796',
        vendor: 'Philips',
        description: 'Hue Filament White E12',
        extend: hueExtend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['LTA007'],
        model: '9290024783',
        vendor: 'Philips',
        description: 'Hue Filament White Ambiance A60/E27 Bluetooth',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [222, 454]}),
    },
    {
        zigbeeModel: ['LWV002'],
        model: '046677551780',
        vendor: 'Philips',
        description: 'Hue white filament Edison ST19 LED',
        extend: hueExtend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['LWV003'],
        model: '929002459201',
        vendor: 'Philips',
        description: 'Hue white filament Edison ST72 E27 LED',
        extend: hueExtend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['LWV004'],
        model: '8719514279193',
        vendor: 'Philips',
        description: 'Hue white filament Edison ST72 B22 LED',
        extend: hueExtend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['HML004'],
        model: '3115331PH',
        vendor: 'Philips',
        description: 'Phoenix light',
        extend: hueExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['LLM001'],
        model: '7121131PU/7120031PH/7120131PH/7120231PU',
        vendor: 'Philips',
        description: 'Hue Beyond white and color ambiance suspension/ceiling/table lamp',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['5041131P9', '5041148P9', '929003047301'],
        model: '5041131P9',
        vendor: 'Philips',
        description: 'Hue White ambiance Milliskin',
        extend: hueExtend.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['5042131P9'],
        model: '5042131P9',
        vendor: 'Philips',
        description: 'Hue White ambiance Milliskin (square)',
        extend: hueExtend.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['929003047101', '929003045101_03', '929003045101_01', '929003045101_02'],
        model: '929003047101',
        vendor: 'Philips',
        description: 'Hue White ambiance Milliskin (round)',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['5047131P9', '5047131P6'],
        model: '5047131P9',
        vendor: 'Philips',
        description: 'Hue White ambiance Buckram single spotlight with bluetooth',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['5047231P6'],
        model: '5047231P6',
        vendor: 'Philips',
        description: 'Hue White ambiance Buckram double spotlight',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['5047331P6'],
        model: '5047331P6',
        vendor: 'Philips',
        description: 'Hue White ambiance Buckram triple spotlight',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['5047130P9'],
        model: '5047130P9',
        vendor: 'Philips',
        description: 'Hue White ambiance Buckram single spotlight with bluetooth',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['5047130P6'],
        model: '5047130P6',
        vendor: 'Philips',
        description: 'Hue White ambiance Buckram single spotlight with bluetooth',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['HML006'],
        model: '7531609',
        vendor: 'Philips',
        description: 'Hue Phoenix downlight',
        extend: hueExtend.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['3418631P6'],
        model: '3418631P6',
        vendor: 'Philips',
        description: 'Hue Adore bathroom mirror',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['LTW018'],
        model: '3435731P7',
        vendor: 'Philips',
        description: 'Hue Adore white ambiance bathroom mirror',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['LCX001'],
        model: '929002422702',
        vendor: 'Philips',
        description: 'Hue Play gradient lightstrip 55',
        extend: hueExtend.light_onoff_brightness_colortemp_color_gradient({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['LCX002'],
        model: '929002422801',
        vendor: 'Philips',
        description: 'Hue Play gradient lightstrip 65',
        extend: hueExtend.light_onoff_brightness_colortemp_color_gradient({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['LCX003'],
        model: '929002422901',
        vendor: 'Philips',
        description: 'Hue Play gradient lightstrip 75',
        extend: hueExtend.light_onoff_brightness_colortemp_color_gradient({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['929003099301'],
        model: '929003099301',
        vendor: 'Philips',
        description: 'Hue white ambiance Aurelle round panel light',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['3418331P6'],
        model: '3418331P6',
        vendor: 'Philips',
        description: 'Hue white ambiance Adore bathroom mirror light',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['929003046201_01', '929003046201_02', '929003046201_03'],
        model: '929003046201',
        vendor: 'Philips',
        description: 'Hue White Ambiance Runner triple spotlight',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['5309331P6', '5309330P6', '929003046301_03', '929003046301_02'],
        model: '5309331P6',
        vendor: 'Philips',
        description: 'Hue White ambiance Runner triple spotlight',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['5309230P6', '5309231P6', '929003045701_01', '929003045701_02'],
        model: '5309230P6',
        vendor: 'Philips',
        description: 'Hue White ambiance Runner double spotlight',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['929003045601_01', '929003045601_02'],
        model: '8719514338142',
        vendor: 'Philips',
        description: 'Hue White ambiance Runner double spotlight',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['5047230P6', '5047230P6'],
        model: '5047230P6',
        vendor: 'Philips',
        description: 'Hue White ambiance Buckram double spotlight',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['5047430P6'],
        model: '5047430P6',
        vendor: 'Philips',
        description: 'Hue White ambiance Buckram quadruple spotlight',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['5633030P6', '929003046501'],
        model: '5633030P6',
        vendor: 'Philips',
        description: 'Hue White ambiance Pillar spotlamp',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['LCG001'],
        model: '9290019532',
        vendor: 'Philips',
        description: 'Hue White and color ambiance GU10 spot LED with Bluetooth',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['5309030P9', '5309031P9', '5309030P6', '5309031P6', '929003046101'],
        model: '5309030P9',
        vendor: 'Philips',
        description: 'Hue White ambiance Runner single spotlight',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['LCA007'],
        model: '9290024687',
        vendor: 'Philips',
        description: 'Hue White and Color Ambiance A19 1100 lumen',
        extend: hueExtend.light_onoff_brightness_colortemp_color({disableHueEffects: false, colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['RDM002'],
        model: '8719514440937/8719514440999',
        vendor: 'Philips',
        description: 'Hue Tap dial switch',
        fromZigbee: [fz.ignore_command_step, fzLocal.hue_tap_dial, fz.battery],
        toZigbee: [],
        exposes: [e.battery(), e.action(['button_1_press', 'button_1_press_release', 'button_1_hold', 'button_1_hold_release',
            'button_2_press', 'button_2_press_release', 'button_2_hold', 'button_2_hold_release',
            'button_3_press', 'button_3_press_release', 'button_3_hold', 'button_3_hold_release',
            'button_4_press', 'button_4_press_release', 'button_4_hold', 'button_4_hold_release',
            'dial_rotate_left_step', 'dial_rotate_left_slow', 'dial_rotate_left_fast',
            'dial_rotate_right_step', 'dial_rotate_right_slow', 'dial_rotate_right_fast']),
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl', 'manuSpecificPhilips', 'genPowerCfg']);
            const options = {manufacturerCode: 0x100B, disableDefaultResponse: true};
            await endpoint.write('genBasic', {0x0031: {value: 0x000B, type: 0x19}}, options);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        ota: ota.zigbeeOTA,
    },
    {
        fingerprint: [{modelID: 'GreenPower_2', ieeeAddr: /^0x00000000004.....$/}],
        model: '8718696743133',
        vendor: 'Philips',
        description: 'Hue tap',
        fromZigbee: [fz.hue_tap],
        toZigbee: [],
        exposes: [e.action(['press_1', 'press_2', 'press_3', 'press_4'])],
    },
    {
        zigbeeModel: ['LCA005'],
        model: '9290022266A',
        vendor: 'Philips',
        description: 'Hue White and color ambiance A19 800 lumen',
        extend: hueExtend.light_onoff_brightness_colortemp_color({disableHueEffects: false, colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['LWE003'],
        model: '9290020400',
        vendor: 'Philips',
        description: 'Hue White E17 470 lumen',
        extend: hueExtend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['1746630P7'],
        model: '1746630P7',
        vendor: 'Philips',
        description: 'Hue White and Colour Ambiance Amarant linear outdoor light',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['1745430P7'],
        model: '1745430P7',
        vendor: 'Philips',
        description: 'Hue Impress outdoor Pedestal',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['1745130P7'],
        model: '1745130P7',
        vendor: 'Philips',
        description: 'Hue Calla outdoor',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['LTO002'],
        model: '8719514301542',
        vendor: 'Philips',
        description: 'Hue Filament Globe XL Ambiance E27',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [222, 454]}),
    },
    {
        zigbeeModel: ['LTV001'],
        model: '92900244777',
        vendor: 'Philips',
        description: 'Hue White Ambiance E27 ST64 filament bulb',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [222, 454]}),
    },
    {
        zigbeeModel: ['LTO001'],
        model: '8719514301481',
        vendor: 'Philips',
        description: 'Hue Filament Globe Ambiance E27',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [222, 454]}),
    },
    {
        zigbeeModel: ['915005997801'],
        model: '915005997801',
        vendor: 'Philips',
        description: 'Hue White & Color Ambiance Xamento M',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['915005997901'],
        model: '915005997901',
        vendor: 'Philips',
        description: 'Hue White & Color Ambiance Xamento L',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['929002966401'],
        model: '929002966401',
        vendor: 'Philips',
        description: 'Hue White & Color Ambiance Surimu square panel',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['929002966501'],
        model: '929002966501',
        vendor: 'Philips',
        description: 'Hue White and Color Ambiance Surimu rectangle panel',
        extend: hueExtend.light_onoff_brightness_colortemp_color({disableHueEffects: false, colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['5060930P7_01', '5060930P7_02', '5060930P7_03', '5060930P7_04'],
        model: '5060930P7',
        vendor: 'Philips',
        description: 'Hue White & Color Ambiance Centris ceiling light (3 spots)',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['5060931P7_01', '5060931P7_02', '5060931P7_03', '5060931P7_04'],
        model: '5060931P7',
        vendor: 'Philips',
        description: 'Hue White & Color Ambiance Centris ceiling light (3 spots)',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['LTF001'],
        model: '6109231C5',
        vendor: 'Philips',
        description: 'Hue white ambiance Apogee square',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['LTF002'],
        model: '6109331C5',
        vendor: 'Philips',
        description: 'Hue white ambiance Apogee round',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['5047131P8'],
        model: '5047131P8',
        vendor: 'Philips',
        description: 'Hue White ambiance Buckram single spotlight',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['1746530P7'],
        model: '1746530P7',
        vendor: 'Philips',
        description: 'Hue White and color ambiance Daylo outdoor wall lamp',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['1746547P7'],
        model: '1746547P7',
        vendor: 'Philips',
        description: 'Hue White and color ambiance Daylo outdoor wall lamp',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['LTA005'],
        model: '8719514392830',
        vendor: 'Philips',
        description: 'Hue White Ambiance E27 filament screw globe',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [222, 454]}),
    },
    {
        zigbeeModel: ['LTA006'],
        model: '8719514301443',
        vendor: 'Philips',
        description: 'Hue White Ambiance B22 filament screw globe',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [222, 454]}),
    },
    {
        zigbeeModel: ['LWE006'],
        model: '929002294102',
        vendor: 'Philips',
        description: 'Hue white candle bulb E14 bluetooth',
        extend: hueExtend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['LWE007'],
        model: '9290030211',
        vendor: 'Philips',
        description: 'Hue white Candle bulb E14 bluetooth',
        extend: hueExtend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['LCD003'],
        model: '8719514344723',
        vendor: 'Philips',
        description: 'Akari downlight',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['LCD004'],
        model: '8719514382350',
        vendor: 'Philips',
        description: 'Akari downlight',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['LCD005'],
        model: '9290031345',
        vendor: 'Philips',
        description: 'Hue white and color ambiance 4" retrofit recessed downlight',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['LCD006'],
        model: '9290031346',
        vendor: 'Philips',
        description: 'Hue white and color ambiance 5/6" retrofit recessed downlight',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['LCD007'],
        model: '579573',
        vendor: 'Philips',
        description: 'Hue White and Color Ambiance Slim Downlight 6"',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['LWE004'],
        model: '8719514302235',
        vendor: 'Philips',
        description: 'Hue White Filament Bulb E14',
        extend: hueExtend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['LWA019'],
        model: '9290024691',
        vendor: 'Philips',
        description: 'Hue white single filament bulb A19 E26 with Bluetooth (1100 Lumen)',
        extend: hueExtend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['LWA029'],
        model: '9290024691A',
        vendor: 'Philips',
        description: 'Hue white single filament bulb A19 E26 with Bluetooth (1100 Lumen)',
        extend: hueExtend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['915005998201'],
        model: '915005998201',
        vendor: 'Philips',
        description: 'Hue Bluetooth white & color ambiance ceiling lamp Infuse',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['915005997301', '915005997201'],
        model: '915005997301',
        vendor: 'Philips',
        description: 'Hue Bluetooth white & color ambiance ceiling lamp Infuse medium',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['915005997501', '915005997401'],
        model: '915005997501',
        vendor: 'Philips',
        description: 'Hue Bluetooth white & color ambiance ceiling lamp Infuse large',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['929003531702'],
        model: '929003531702',
        vendor: 'Philips',
        description: 'Hue Bluetooth white & color ambiance ceiling lamp Infuse medium',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['929003045001_01', '929003045001_02', '929003045001_03'],
        model: '9290019533',
        vendor: 'Philips',
        description: 'Hue white ambiance GU10 with Bluetooth',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['3417611P6', '3417511P9'],
        model: '3417511P9',
        vendor: 'Philips',
        description: 'Hue white ambiance bathroom recessed downlight Adore with Bluetooth',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['LWS002'],
        model: '046677562229',
        vendor: 'Philips',
        description: 'Hue White PAR20 with Bluetooth',
        extend: hueExtend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['LTO005', '929002980901'],
        model: '929002980901',
        vendor: 'Philips',
        description: 'Hue white ambiance G40 E26 filament globe with Bluetooth',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [222, 454]}),
    },
    {
        zigbeeModel: ['LWB016'],
        model: '9290018609',
        vendor: 'Philips',
        description: 'Hue White E26 806 lumen',
        extend: hueExtend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['3402931P7', '3418231P6'],
        model: '8718696175798',
        vendor: 'Philips',
        description: 'Philips Hue Adore Bathroom Mirror Light',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['929003045901'],
        model: '929003045901',
        vendor: 'Philips',
        description: 'Hue White ambiance Runner spot white (1 spot)',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['915005998101'],
        model: '915005998101',
        vendor: 'Philips',
        description: 'Hue white ambiance pendant black Enrave',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['1740447P0'],
        model: '8718696166079',
        vendor: 'Philips',
        description: 'Hue Tuar outdoor wall light',
        extend: hueExtend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['915005998001'],
        model: '915005998001',
        vendor: 'Philips',
        description: 'Hue white ambiance pendant white Enrave',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['929003054601'],
        model: '929003054601',
        vendor: 'Philips',
        description: 'Hue white ambiance Fair ceiling with Bluetooth white',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['929003048301_01', '929003048301_02', '929003048301_03', '929003048301_04'],
        model: '8719514339163',
        vendor: 'Philips',
        description: 'Hue white ambiance Buckram quadruple spotlight with Bluetooth',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['929003048101_01', '929003048101_02', '929003048101_03'],
        model: '8719514339125',
        vendor: 'Philips',
        description: 'Hue white ambiance Buckram triple spotlight with Bluetooth',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['929003047901_01', '929003047901_02'],
        model: '871951433908',
        vendor: 'Philips',
        description: 'Hue white ambiance Buckram double spotlight with Bluetooth',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['4090131P9'],
        model: '8718696174548',
        vendor: 'Philips',
        description: 'Hue Sana wall lamp with Bluetooth white',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['LTD007'],
        model: '5110731H5',
        vendor: 'Philips',
        description: 'Hue white ambiance Garnea downlight',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['LTE005'],
        model: '9290031452',
        vendor: 'Philips',
        description: 'Hue white ambiance filament E14 (with Bluetooth)',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [222, 454]}),
    },
    {
        zigbeeModel: ['LTB003'],
        model: '046677578138',
        vendor: 'Philips',
        description: 'Hue White ambiance BR30 E26',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['LCX012'],
        model: '929003535301',
        vendor: 'Philips',
        description: 'Hue Festavia gradient light string 250',
        extend: hueExtend.light_onoff_brightness_colortemp_color_gradient({colorTempRange: [153, 500], extraEffects: ['sparkle']}),
    },
    {
        zigbeeModel: ['915005987101'],
        model: '915005987101',
        vendor: 'Philips',
        description: 'Hue Gradient Signe floor lamp (white)',
        extend: hueExtend.light_onoff_brightness_colortemp_color_gradient({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['915005987301'],
        model: '915005987301',
        vendor: 'Philips',
        description: 'Hue Gradient Signe table lamp (white)',
        extend: hueExtend.light_onoff_brightness_colortemp_color_gradient({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['929003526301'],
        model: '929003526301',
        vendor: 'Philips',
        description: 'Hue White & Color Ambiance Xamento M',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['929003074801_01', '929003074801_02', '929003074801_03'],
        model: '929003074801',
        vendor: 'Philips',
        description: 'Hue White and Color Ambiance GU10 (Xamento)',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
        meta: {turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['LWE008'],
        model: '929003021301',
        vendor: 'Philips',
        description: 'Hue White E17 470 lumen',
        extend: hueExtend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['929003046901'],
        model: '8719514338524',
        vendor: 'Philips',
        description: 'Hue white ambiance Pillar spotlight with Bluetooth (black)',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['8719514288232'],
        model: '929002469216',
        vendor: 'Philips',
        description: 'Hue white E27 1100lm with Bluetooth',
        extend: hueExtend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['LTD017'],
        model: '578526',
        vendor: 'Philips',
        description: 'Hue white ambiance extra bright high lumen dimmable LED smart retrofit recessed 6" downlight',
        extend: hueExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['929003115801'],
        model: '929003115801',
        vendor: 'Philips',
        description: 'Hue Perifo ceiling light, 1 pendant (white)',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['929003116201'],
        model: '929003116201',
        vendor: 'Philips',
        description: 'Hue Perifo linear light bar',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['929003115901'],
        model: '929003117101',
        vendor: 'Philips',
        description: 'Hue Perifo ceiling light, 3 pendant (black)',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['929003117201'],
        model: '929003117201',
        vendor: 'Philips',
        description: 'Hue Perifo ceiling light, 3 pendant (white)',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['929003117301'],
        model: '929003117301',
        vendor: 'Philips',
        description: 'Hue Perifo ceiling light, 4 spotlights (black)',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['929003117401'],
        model: '929003117401',
        vendor: 'Philips',
        description: 'Hue Perifo ceiling light, 4 spotlights (white)',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['929003117701'],
        model: '929003117701',
        vendor: 'Philips',
        description: 'Hue Perifo Wall Light, 3 spotlights (black)',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        zigbeeModel: ['929003117801'],
        model: '929003117801',
        vendor: 'Philips',
        description: 'Hue Perifo Wall Light, 3 spotlights (white)',
        extend: hueExtend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
];
