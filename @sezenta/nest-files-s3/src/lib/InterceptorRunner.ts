export default interface InterceptorInterface {
  filter: (value: any, field?: string | number) => boolean;
  map: (value: any, field?: string | number) => any;
}

export class InterceptorRunner {
  interceptors: InterceptorInterface[] = [];

  constructor(...interceptors: InterceptorInterface[]) {
    this.interceptors = interceptors;
  }

  filter = (value: any, field?: string | number): boolean => {
    return !this.interceptors.find((itc) => !itc.filter(value, field));
  };

  map = (value: any, field?: string | number): any => {
    let val = value;
    for (const itc of this.interceptors) {
      val = itc.map(val, field);
    }
    return val;
  };

  run = <T = any>(value: T, field?: string | number): T => {
    if (value !== null && value !== undefined) {
      if (Array.isArray(value)) {
        return value.filter(this.filter).map(this.run) as any;
      } else if (Object.prototype.toString.call(value) === '[object Date]') {
        return this.map(value, field);
      } else if (typeof value === 'object') {
        return Object.fromEntries(
          Object.entries(value)
            .filter((v) => this.filter(v[1], v[0]))
            .map((v) => [v[0], this.run(v[1], v[0])]),
        ) as any;
      } else {
        return this.map(value, field);
      }
    }
    return undefined as any;
  };
}
