import {DateTime} from "luxon";

// region CRFormData
/**
 * Class for flexible library configuration
 */
export class CRFormData {
  static default_formats = {
    'format_datetime': 'dd.MM.yyyy HH:mm',
    'format_date': 'dd.MM.yyyy',
    'mask_datetime': '__.__.____ __:__',
    'mask_date': '__.__.____',
  }

  static default_error_class = 'b-danger'

  static formats = CRFormData.default_formats
  static error_class = CRFormData.default_error_class

  static set_formats(formats) {
    CRFormData.formats = formats
  }

  static set_error_class(error_class) {
    CRFormData.error_class = error_class
  }
}

// endregion

// region Error
class CustomError extends Error {
  constructor(name, message) {
    super(message)
    this.name = "name"
  }
}

class FieldError extends CustomError {
  constructor(field_name = '') {
    let message = `Not found field with name "${field_name}"`
    super('FieldError', message)
  }
}

// endregion


// region Form
/**
 * A class that is an impersonation of the client's data entry form. Accepts form fields as dictionary.
 * Both the built-in library fields and any other fields can be used as fields.
 * Validation for fields undefined in the library will not be performed.
 */
export class Form {
  constructor(fields) {
    this._form_fields_names = []
    this._value_fields_names = []
    this._changed_fields = []
    this._errors = {}

    for (let k in fields) {
      this[k] = fields[k]
      if (this[k] instanceof FormField || this[k] instanceof ListField) {
        this._form_fields_names.push(k)
      } else {
        this._value_fields_names.push(k)
      }
    }
  }

  /**
   * Returns an object containing the values of all form fields, including regular fields
   * and fields of type FormField or ListField, cleaned for submission to the server.
   * @returns Object
   */
  get value_fields() {
    let fields = {}

    for (let k of this._form_fields_names) {
      fields[k] = this[k].value_clear
    }

    for (let k of this._value_fields_names) {
      fields[k] = this[k]
    }

    return fields
  }

  get value_list() {
    let value_list = []

    for (let k of this._form_fields_names) {
      value_list.push(this[k].value_clear)
    }

    return value_list
  }

  /**
   * Updates the form's field values based on the provided dictionary,
   * setting values for both regular fields and fields of type FormField or ListField.
   */
  set fields(fields) {
    for (let k in fields) {
      if (this[k] instanceof FormField || this[k] instanceof ListField) {
        this[k].value = fields[k]
        this[k].is_valid = true
      } else {
        this[k] = fields[k]
      }
    }
  }

  /**
   * Updates only the existing fields of the form
   */
  set existing_fields(fields) {
    for (let k in fields) {
      if (k in this) {
        if (this[k] instanceof FormField || this[k] instanceof ListField) {
          this[k].value = fields[k]
          this[k].is_valid = true
        } else {
          this[k] = fields[k]
        }
      }
    }
  }

  get errors() {
    return this._errors
  }

  set errors(errors) {
    for (let k in errors) {
      let clear_k = k.split('.')

      clear_k = clear_k.length > 1 ? clear_k[1] : k

      if (this._form_fields_names.includes(clear_k)) {
        this[clear_k].error = errors[k]
      } else {
        this._errors[k] = errors[k]
      }
    }
  }

  /**
   * Validates data in all fields and return result of validation
   * @returns {boolean}
   */
  check_valid() {
    let is_valid = true

    for (let k of this._form_fields_names) {
      this[k]._checkValid()
      if (this[k].is_valid === false) {
        if (is_valid) is_valid = false
      } else if (this[k].is_valid === null) {
        if (this[k].is_required) {
          if (is_valid) is_valid = false
          this[k].is_valid = false
        }
      }
    }

    return is_valid
  }
}

// endregion


// region FormField
export class FormField {
  constructor(default_value = null, is_required = true) {
    this._value = default_value
    this.default_value = default_value

    this.is_required = is_required
    this.is_changed = false

    this.have_empty_value = false

    this.is_valid = default_value === null ? null : true

    this._error = null
  }

  /**
   * Return object with css class name as key and the need to set it as value (Vue JS only)
   * @returns {Object}
   */
  get css_valid() {
    return {[CRFormData.error_class]: this.is_valid === false}
  }

  /**
   * @returns {null|*} - returns a cleared value, typically used for sending to the server
   */
  get value_clear() {
    return this._value
  }

  /**
   * @returns {null|*} - returns a value that is typically used for display in forms
   */
  get value() {
    return this._value
  }

  /**
   * @param value - sets a value that is subsequently subject to compliance checks
   */
  set value(value) {
    this._value = value
    this._checkValid()
  }

  /**
   * @returns {*|string} - returns errors, typically used to display validation errors from the server
   */
  get error() {
    return this._error ? this._error : ''
  }

  set error(value) {
    this._error = value
  }

  /**
   * @param value - sets validation errors for further display in the form
   * @private
   */
  set __valid_error(value) {
    let valid_error_text = this.error.split(' | ')[0]
    let error_text = this.error.split(' | ')[1]

    if (value) {
      if (!valid_error_text) {
        error_text ? this.error = `${value} | ${this.error}` : this.error = value
      }
    } else {
      this.error = this.error.split(' | ')[1]
    }
  }

  filed_value_is_zero(value) {
    return value === 0 || value === '0'
  }

  get value_is_zero() {
    return this.filed_value_is_zero(this._value)
  }

  filed_value_is_empty(value) {
    let value_is_empty_object = false
    if (typeof value === 'object' && value !== null) {
      value_is_empty_object = Object.keys(value).length === 0
    }

    return value === null || value === undefined || value === '' || value_is_empty_object
  }

  get value_is_empty() {
    return this.filed_value_is_empty(this._value)
  }

  /**
   * Sets default value for value field
   */
  clear() {
    this.value = this.default_value
  }

  /**
   * Validates data and set result of validation in is_valid field
   */
  _checkValid() {
    if (this.value_is_empty && !this.value_is_zero) {
      this.is_valid = !this.is_required
    } else {
      this.is_valid = true
    }
  }

  // region Kwargs
  /**
   * @typedef {Object} Kwargs
   * @property {boolean, undefined} is_required - whether the field is required to be filled in
   * @property {any, undefined} default_value
   * @property {number, undefined} min_length - min length for string
   * @property {number, undefined} max_length - max length for string
   * @property {string, undefined} regex - regular expression that the string must match
   * @property {string, undefined} example - example of correct value
   * @property {string, undefined} mask - field fill mask
   * @property {number, undefined} min - minimal value for number
   * @property {number, undefined} max - maximum value for number
   * @property {number, undefined} decimal_places - maximum count of digits to the right of the decimal point
   * @property {number, undefined} max_digits - maximum count of digits in number
   * @property {boolean, undefined} have_empty_value - value can be empty
   * @property {string, undefined} returned_key - the name of the return value field for SelectObjectField
   */

  // endregion

  /**
   * @param {Kwargs} kwargs - dictionary with object fields
   * @returns {this} - returns the current object
   * @throws {FieldError} - Throws an error if the key is not found in the dictionary
   */
  kwargs(kwargs = {}) {
    for (let k in kwargs) {
      if (k in this) {
        this[k] = kwargs[k]
      } else {
        throw new FieldError(`${k}`)
      }
    }
    return this
  }
}

// endregion


// region StringField
export class StringField extends FormField {
  constructor(default_value = '', is_required = true, min_length = null, max_length = null, regex = '', example = '', mask = '', return_with_mask = false) {
    super(default_value, is_required)
    this.min_length = min_length
    this.max_length = max_length
    this.regex = regex
    this.example = example
    this.mask = mask
    this.return_with_mask = return_with_mask
  }

  /**
   * @returns {null|*} - returns a cleared value, typically used for sending to the server
   */
  get value_clear() {
    if (this.return_with_mask) {
      return this._value === '' ? null : this._value
    }

    let mask_replace = this.mask.split(/_/g).join('')

    let result = this._value.replace(new RegExp(`[${mask_replace}]`, 'g'), '')

    if (this.have_empty_value) {
      return result
    }

    return result === '' ? null : result
  }

  get value() {
    return this._value
  }

  set value(value) {
    if (this.mask === '' || !value) {
      super.value = value
      return
    }

    if (this._value && this._value.length > value.length) {
      super.value = value
      return
    }

    let self = this

    let i = 0

    let mask_replace = this.mask.split(/_/g).join('')

    let clear_value = value.replace(new RegExp(`[${mask_replace}]`, 'g'), '')

    if (clear_value.length === 0) {
      super.value = clear_value
      return
    }

    let new_value = this.mask.replace(/_/g, function (a) {
      return i < clear_value.length ? clear_value.charAt(i++) || self.mask.charAt(i) : a
    })

    i = new_value.indexOf("_")
    if (i !== -1) {
      super.value = new_value.slice(0, i)
      return
    }

    super.value = new_value
  }

  /**
   * Validates data and set result of validation in is_valid field
   */
  _checkValid() {
    super._checkValid()
    if (!this.is_valid) {
      return
    }

    if (this.value_is_empty && !this.is_required) {
      this.is_valid = true
      this._value = ''
      return
    }

    if (this.min_length != null) {
      if (this.min_length > this._value.length) {
        this.is_valid = false
        this.__valid_error = `Минимум ${this.min_length} символов`
        return
      }
      this.__valid_error = null
    }

    if (this.max_length != null) {
      if (this.max_length < this._value.length) {
        this.is_valid = false
        this.__valid_error = `Максимум ${this.max_length} символов`
        return
      } else {
        this.__valid_error = null
      }
    }

    this.is_valid = !!this._value.match(this.regex)
    if (!this.is_valid) {
      this.__valid_error = `Пример: ${this.example}`
    }
  }
}

export class EmailField extends StringField {
  constructor(default_value = '', is_required = true) {
    super(default_value, is_required, 5, 100, '^[^@]+@[^@.]+[.]{1}[^@.]+$', 'example@domain.net', '')
  }
}

export class PhoneField extends StringField {
  constructor(default_value = '', is_required = true) {
    super(default_value, is_required, 10, 16, '^[+][\\d]\\d+$', '+79999999999', '+_______________', true)
  }
}

export class TextField extends StringField {
  constructor(default_value = '', is_required = true, min_length = null, max_length = 50) {
    super(default_value, is_required, min_length, max_length, '^[\\w а-яА-ЯёЁ \\W]+$', 'символы алфавита, цифры и специальные символы')
  }
}

export class NameField extends StringField {
  constructor(default_value = '', is_required = true, min_length = null, max_length = 50) {
    super(default_value, is_required, min_length, max_length, '^[a-zA-Zа-яА-ЯёЁ]+$', 'символы алфавита')
  }
}

export class TimeField extends StringField {
  constructor(default_value = '', is_required = true) {
    super(default_value, is_required, 5, 5, '^\\d{2}:\\d{2}$', 'HH:mm', '__:__', true)
  }

  get value() {
    return this._value
  }

  set value(value) {
    if (!value) {
      super.value = value
      return
    }

    let hour = value.slice(0, 2)
    let minute = value.slice(3, 5)

    let new_hour = hour > 23 ? '23' : hour
    let new_minute = minute > 59 ? '59' : minute

    super.value = new_hour + value.slice(2, 3) + new_minute
  }
}

export class DateTimeField extends StringField {
  constructor(default_value = '', is_required = true) {
    super(default_value, is_required)
    this.set_format()
  }

  set_format() {
    this.dt_format = CRFormData.formats.format_datetime
    this.d_format = CRFormData.formats.format_date
    this.mask = CRFormData.formats.mask_datetime
    this.example = CRFormData.formats.format_datetime
  }

  /**
   * Validates data and set result of validation in is_valid field
   */
  _checkValid() {
    if (this.value_is_empty) {
      this.is_valid = !this.is_required
      return
    }

    let datetime_value = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})(:\d{2}.\d{3}\+\d{2}:\d{2})?$/.test(this._value) ? DateTime.fromISO(this._value) : DateTime.fromFormat(this._value, this.dt_format)

    this.is_valid = datetime_value.isValid
  }

  get value() {
    return this._value
  }

  set value(value) {
    if (!value) {
      super.value = value
      return
    }

    let datetime_value
    if (typeof value === 'object') {
      datetime_value = value
    } else {
      datetime_value = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})(:\d{2}.\d{3}\+\d{2}:\d{2})?$/.test(value) ? DateTime.fromISO(value) : DateTime.fromFormat(value, this.dt_format)
    }

    if (datetime_value.isValid) {
      super.value = datetime_value.toFormat(this.dt_format)
    } else {
      super.value = value
    }
  }

  /**
   * @returns {null|*} - returns a cleared value, typically used for sending to the server
   */
  get value_clear() {
    let datetime_value = DateTime.fromFormat(this._value || '', this.dt_format)
    if (datetime_value.isValid) {
      return datetime_value.toISO()
    } else {
      return null
    }
  }

  get day() {
    let date_regex = this.d_format.replace(/[dMyms]/g, '\\d')
    let date = this._value.match(date_regex)
    if (date) {
      let datetime_value = DateTime.fromFormat(date[0], this.d_format)
      if (datetime_value.isValid) {
        return datetime_value.day
      }
    }
    return ''
  }

  get month() {
    let date_regex = this.d_format.replace(/[dMyms]/g, '\\d')
    let date = this._value.match(date_regex)
    if (date) {
      let datetime_value = DateTime.fromFormat(date[0], this.d_format)
      if (datetime_value.isValid) {
        return datetime_value.month
      }
    }
    return ''
  }

  get year() {
    let date_regex = this.d_format.replace(/[dMyms]/g, '\\d')
    let date = this._value.match(date_regex)
    if (date) {
      let datetime_value = DateTime.fromFormat(date[0], this.d_format)
      if (datetime_value.isValid) {
        return datetime_value.year
      }
    }
    return ''
  }

  get date() {
    let date_regex = this.d_format.replace(/[dMyms]/g, '\\d')
    let date = this._value.match(date_regex)
    if (date) {
      return date[0]
    } else {
      return ''
    }
  }

  get time() {
    let datetime_value = DateTime.fromFormat(this._value || '', this.dt_format)
    if (datetime_value.isValid) {
      return datetime_value.toFormat('HH:mm')
    } else {
      return ''
    }
  }
}

export class DateField extends DateTimeField {
  constructor(default_value = '', is_required = true) {
    super(default_value, is_required)
    this.set_format()
  }

  set_format(value) {
    this.dt_format = CRFormData.formats.format_datetime
    this.d_format = CRFormData.formats.format_date
    this.mask = CRFormData.formats.mask_date
    this.example = CRFormData.formats.format_date
  }

  /**
   * Validates data and set result of validation in is_valid field
   */
  _checkValid() {
    if (this.value_is_empty) {
      this.is_valid = !this.is_required
      return
    }

    let datetime_value = DateTime.fromFormat(this._value || '', this.d_format)

    this.is_valid = datetime_value.isValid
  }

  get value() {
    return this._value
  }

  set value(value) {
    if (!value) {
      super.value = value
      return
    }

    let datetime_value
    if (typeof value === 'object') {
      datetime_value = value
    } else {
      datetime_value = /^\d{4}-\d{2}-\d{2}$/.test(value) ? DateTime.fromFormat(value, 'yyyy-MM-dd') : DateTime.fromFormat(value, this.d_format)
    }

    if (datetime_value.isValid) {
      super.value = datetime_value.toFormat(this.d_format)
    } else {
      super.value = value
    }
  }

  /**
   * @returns {null|*} - returns a cleared value, typically used for sending to the server
   */
  get value_clear() {
    let datetime_value = DateTime.fromFormat(this._value || '', this.d_format)
    if (datetime_value.isValid) {
      return datetime_value.toFormat('yyyy-MM-dd')
    } else {
      return null
    }
  }

  get day() {
    let datetime_value = DateTime.fromFormat(this._value || '', this.d_format)
    if (datetime_value.isValid) {
      return datetime_value.day
    } else {
      return ''
    }
  }

  get month() {
    let datetime_value = DateTime.fromFormat(this._value || '', this.d_format)
    if (datetime_value.isValid) {
      return datetime_value.month
    } else {
      return ''
    }
  }

  get year() {
    let datetime_value = DateTime.fromFormat(this._value || '', this.d_format)
    if (datetime_value.isValid) {
      return datetime_value.year
    } else {
      return ''
    }
  }
}

export class LoginField extends StringField {
  constructor(default_value = '', is_required = true) {
    super(default_value, is_required, 1, 50, '^[^+]\\w{0,99}$', 'любые буквы (то, что может быть частью слова), а также цифры и _')
  }
}

export class PasswordField extends StringField {
  constructor(default_value = '', is_required = true) {
    super(default_value, is_required, 8, 50, '')
  }
}

export class PasswordSmallField extends StringField {
  constructor(default_value = '', is_required = true) {
    super(default_value, is_required, 4, 50, '')
  }
}

export class PasswordTinyField extends StringField {
  constructor(default_value = '', is_required = true) {
    super(default_value, is_required, 1, 50, '')
  }
}

export class IpField extends StringField {
  constructor(default_value = '', is_required = true) {
    super(default_value, is_required, 7, 15, '^\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}$', '4.5.6.7')
  }
}

export class ColorHexField extends StringField {
  constructor(default_value = '', is_required = true) {
    super(default_value, is_required, 7, 7, '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$', '#FACE8D')
  }
}

export class HashMD5 extends StringField {
  constructor(default_value = '', is_required = true) {
    super(default_value, is_required, 32, 32, '^[A-Fa-f0-9]+$', 'HashMD5')
  }
}

export class MacField extends StringField {
  constructor(default_value = '', is_required = true) {
    super(default_value, is_required, 17, 17, '^([A-Fa-f0-9]{2}:){5}[A-Fa-f0-9]{2}$', '00:00:00:00:00:00', '__:__:__:__:__:__', true)
  }
}

// endregion


// region NumberField
export class NumberField extends FormField {
  constructor(default_value = null, is_required = true, min = null, max = null, example = 'целое число') {
    super(default_value, is_required)
    this.min = min
    this.max = max
    this.example = example
  }

  _check_number_match() {
    if (!this._value.toString().match('^\\d+$')) {
      this.is_valid = false
      this.__valid_error = `Пример: ${this.example}`
    }
  }

  _check_valid_number() {
    if (this.value_is_empty && !this.is_required) {
      return
    }

    if (typeof this._value !== "number") {
      if (typeof this._value !== "string") {
        this.is_valid = false
        this.__valid_error = `Пример: ${this.example}`
      } else {
        if (this._value === '' && this.is_required) {
          this.is_valid = false
          return
        }

        this._check_number_match()
      }
    }

    if (this.is_valid) {
      this.__valid_error = null
    }
  }

  /**
   * Validates data and set result of validation in is_valid field
   */
  _checkValid() {
    super._checkValid()
    if (!this.is_valid) {
      return
    }

    this._check_valid_number()

    if (this.min) {
      this.is_valid = this._value >= this.min
      if (!this.is_valid) {
        this.__valid_error = `Минимум: ${this.min}`
      } else {
        this.__valid_error = null
      }
      return
    }

    if (this.max) {
      this.is_valid = this._value <= this.max
      if (!this.is_valid) {
        this.__valid_error = `Максимум: ${this.max}`
      } else {
        this.__valid_error = null
      }
      return
    }
  }
}

export class DecimalField extends NumberField {
  constructor(default_value = null, is_required = true, min = null, max = null,
              decimal_places = 2, max_digits = 8) {
    super(default_value, is_required, min, max, '1.00 или 1')
    this.decimal_places = decimal_places
    this.max_digits = max_digits
  }

  _check_number_match() {
    if (!this._value.toString().match('^[\\d.]+$')) {
      this.is_valid = false
      this.__valid_error = `Пример: ${this.example}`
    }

    if (this._value.toString().split('.').length > 2) {
      this.is_valid = false
      this.__valid_error = `Пример: ${this.example}`
    }
  }

  /**
   * Validates data and set result of validation in is_valid field
   */
  _checkValid() {
    super._checkValid()
    if (!this.is_valid) {
      return
    }

    let dec_str = this._value.toString()
    let dec_parts = dec_str.split('.')
    let p1 = dec_parts[0]

    if (p1.length > this.max_digits - this.decimal_places) {
      this.is_valid = false
      this.__valid_error = `Максимальное количество знаков перед запятой ${this.max_digits - this.decimal_places}`
    }

    if (dec_parts.length === 2) {
      let p2 = dec_parts[1]

      if (p1.length + p2.length > this.max_digits) {
        this.is_valid = false
        this.__valid_error = `Максимальное количество знаков ${this.max_digits}`
      } else {
        if (p2.length === 0) {
          this.is_valid = false
          this.__valid_error = `После точки должен быть минимум 1 знак`
        } else if (p2.length > this.decimal_places) {
          this.is_valid = false
          this.__valid_error = `Максимальное количество знаков после запятой ${this.decimal_places}`
        }
      }
    }
  }

  get value() {
    if (/^\d+\.$/.test(this._value) || !this._value) {
      return this._value
    } else if ((!/^\d+\.$/.test(this._value) && !/^\d+$/.test(this._value)) || typeof this._value == "number") {
      return this._value
    } else {
      return Number(this._value)
    }
  }

  set value(value) {
    super.value = value
  }
}

// endregion


// region SelectField
export class SelectField extends FormField {
  constructor(default_value = 0, is_required = true, min = 1) {
    super(default_value, is_required)
    this.min = min
  }

  /**
   * Validates data and set result of validation in is_valid field
   */
  _checkValid() {
    super._checkValid()
    if (!this.is_valid) {
      return
    }

    if ((this.value_is_empty && !this.value_is_zero) || this._value < this.min) {
      this.is_valid = !this.is_required
    } else {
      this.is_valid = true
    }

    if (this.is_valid) {
      this.__valid_error = null
    } else {
      this.__valid_error = 'Необходимо выбрать значение'
    }
  }

  /**
   * @returns {null|*} - returns a cleared value, typically used for sending to the server
   */
  get value_clear() {
    let value = this._value

    if (!this.is_required && (this.value_is_zero || this.value_is_empty)) {
      value = null
    }

    return value
  }
}

export class SelectObjectField extends FormField {
  constructor(default_value = {}, is_required = true, returned_key = '') {
    super(default_value, is_required)
    this.returned_key = returned_key
  }

  check_returned_key() {
    if (!Object.keys(this._value).includes(this.returned_key)) {
      throw new FieldError(`${this.returned_key}`)
    }
  }

  get returned_value() {
    return this._value[this.returned_key]
  }

  /**
   * Validates data and set result of validation in is_valid field
   */
  _checkValid() {
    super._checkValid()
    if (!this.is_valid) {
      return
    }

    this.check_returned_key()

    if (this.is_required && this.value_is_empty) {
      this.is_valid = false
      this.__valid_error = 'Необходимо выбрать значение'
    } else {
      this.is_valid = true
      this.__valid_error = null
    }

    if (this.filed_value_is_empty(this.returned_value)) {
      console.warn('Returned key field value is empty')
    }
  }

  get value() {
    return this._value
  }

  set value(value) {
    this._value = value
    if (!this.value_is_empty) this._checkValid()
  }

  /**
   * @returns {null|*} - returns a cleared value, typically used for sending to the server
   */
  get value_clear() {
    this.check_returned_key()

    let value = null

    if (!this.value_is_empty) {
      value = this.returned_value
    }

    return value
  }
}

// endregion


// region ListField
export class ListField {
  constructor(default_value = [], is_required = true) {
    this._value = default_value
    this.is_required = default_value

    if (default_value.length === 0) {
      is_required ? this._is_valid = null : this._is_valid = true
    } else if (default_value.length > 0) {
      this._is_valid = true
    }
  }

  get is_valid() {
    this._checkValid()
    return this._is_valid
  }

  /**
   * @returns {null|*} - returns a cleared value, typically used for sending to the server
   */
  get value_clear() {
    let value_fields = []

    for (let f of this._value) {
      value_fields.push(f.value_fields)
    }

    return value_fields
  }

  get form_value() {
    return this._value
  }

  get length() {
    return this._value.length
  }

  push(value) {
    this._value.push(value)
    return this._value
  }

  delete(index) {
    this._value.splice(index, 1)
    return this._value
  }

  /**
   * Validates data and set result of validation in is_valid field
   */
  _checkValid() {
    let is_valid = true

    for (let f of this._value) {
      if (!f.check_valid() && is_valid) {
        is_valid = false
      }
    }

    this._is_valid = is_valid
  }
}

// endregion

