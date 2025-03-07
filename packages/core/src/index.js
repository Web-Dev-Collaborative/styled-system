import assign from 'object-assign'

export const merge = (a, b) => {
  let result = assign({}, a, b)
  for (const key in a) {
    if (!a[key] || typeof b[key] !== 'object') continue
    assign(result, {
      [key]: assign(a[key], b[key]),
    })
  }
  return result
}

const defaults = {
  breakpoints: [40, 52, 64].map(n => n + 'em'),
}
const createMediaQuery = n => `@media screen and (min-width: ${n})`
const getValue = (n, scale) => get(scale, n, n)

export const get = (obj, key, def, p, undef) => {
  key = key && key.split ? key.split('.') : [key]
  for (p = 0; p < key.length; p++) {
    obj = obj ? obj[key[p]] : undef
  }
  return obj === undef ? def : obj
}

export const createParser = config => {
  const cache = {}
  const parse = props => {
    let styles = {}
    for (const key in props) {
      if (!config[key]) continue
      const sx = config[key]
      const raw = props[key]
      const scale = get(props.theme, sx.scale, sx.defaults)

      if (typeof raw === 'object') {
        cache.breakpoints =
          cache.breakpoints ||
          get(props.theme, 'breakpoints', defaults.breakpoints)
        if (Array.isArray(raw)) {
          cache.media = cache.media || [
            null,
            ...cache.breakpoints.map(createMediaQuery),
          ]
          styles = merge(
            styles,
            parseResponsiveStyle(cache.media, sx, scale, raw)
          )
          continue
        }
        if (raw !== null) {
          styles = merge(
            styles,
            parseResponsiveObject(cache.breakpoints, sx, scale, raw)
          )
        }
        continue
      }

      assign(styles, sx(raw, scale))
    }

    return styles
  }
  parse.config = config
  parse.propNames = Object.keys(config)
  parse.cache = cache
  return parse
}

const parseResponsiveStyle = (mediaQueries, sx, scale, raw) => {
  let styles = {}
  raw.slice(0, mediaQueries.length).forEach((value, i) => {
    const media = mediaQueries[i]
    const style = sx(value, scale)
    if (style === undefined) return
    if (!media) {
      assign(styles, style)
    } else {
      assign(styles, {
        [media]: assign({}, styles[media], style),
      })
    }
  })
  return styles
}

const parseResponsiveObject = (breakpoints, sx, scale, raw) => {
  let styles = {}
  for (let key in raw) {
    const breakpoint = breakpoints[key]
    const value = raw[key]
    const style = sx(value, scale)
    if (!breakpoint) {
      assign(styles, style)
    } else {
      const media = createMediaQuery(breakpoint)
      assign(styles, {
        [media]: assign({}, styles[media], style),
      })
    }
  }
  return styles
}

export const createStyleFunction = ({
  properties,
  property,
  scale,
  transform = getValue,
  defaultScale,
}) => {
  properties = properties || [property]
  const sx = (value, scale) => {
    const result = {}
    const n = transform(value, scale)
    if (n === null) return
    properties.forEach(prop => {
      result[prop] = n
    })
    return result
  }
  sx.scale = scale
  sx.defaults = defaultScale
  return sx
}

// new v5 API
export const system = (args = {}) => {
  const config = {}
  Object.keys(args).forEach(key => {
    const conf = args[key]
    if (conf === true) {
      // shortcut definition
      config[key] = createStyleFunction({
        property: key,
        scale: key,
      })
      return
    }
    config[key] = createStyleFunction(conf)
  })

  const parser = createParser(config)
  return parser
}

export const compose = (...parsers) => {
  let config = {}
  parsers.forEach(parser => {
    if (!parser || !parser.config) return
    assign(config, parser.config)
  })
  const parser = createParser(config)

  return parser
}
