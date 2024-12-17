# Library for Data Validation on the Frontend
[Link to GitHub repository](https://github.com/ArhiMENchik/CrFormValidation)

## Overview
This library provides a simple interface for creating and validating forms on the frontend.
It allows you to define form fields, validate the input, and update field values.

## Example Usage

### Create Form
You can create a form by defining its fields and setting validation requirements (e.g., required fields, format validation).
```javascript
const form = new Form({
  login: new LoginField().kwargs({is_required: false}),  // Login field with optional requirement
  phone: new PhoneField(),  // Phone field with default validation
  email: new EmailField().kwargs({is_required: false}),  // Email field with optional requirement
  name: new NameField(),  // Name field with default validation
  surname: new NameField(),  // Surname field with default validation
  birthdate: new DateField(),  // Date field for birthdate with default validation
})
```

### Validate Form
To validate the form, call the check_valid() method. If validation passes, you can proceed to use the form data.
If validation fails, an error message will be shown.
```javascript
function create_user() {
  let is_valid = form.check_valid()  // Validates all fields
  if (!is_valid) return  // If validation fails, stop further execution
  
  let form_data = form.value_fields  // Retrieve validated form values
  // Further code to submit the form or process data
}
```

### Updating the value of form fields
#### ``fields``
The ``fields`` property allows you to update the form's field values directly. 
If you provide values for fields that are **not defined** in the form, these fields will be added dynamically to the form.
```javascript
function update_user() {
  form.fields = {
    login: 'TestUser',  // Set login field value
    phone: '+79999999999',  // Set phone field value
    email: 'test@test.test',  // Set email field value
    name: 'Ivan',  // Set name field value
    surname: 'Ivanov',  // Set surname field value
    birthdate: '26.12.2000',  // Set birthdate field value
    age: 23  // New field added dynamically to the form
  }
  // 'age' field will be dynamically added, even though it's not initially defined in the form.

}
```

#### ``existing_fields``
The ``existing_fields`` property allows you to update the values of only the fields that **already exist** in the form.
If you provide values for fields that are not defined, they will be ignored.
```javascript
function update_user() {
  form.existing_fields = {
    login: 'TestUser',  // Set login field value
    phone: '+79999999999',  // Set phone field value
    email: 'test@test.test',  // Set email field value
    name: 'Ivan',  // Set name field value
    surname: 'Ivanov',  // Set surname field value
    birthdate: '26.12.2000',  // Set birthdate field value
    age: 23  // This field will be ignored, as it's not defined in the form
  }
  // Only the fields that exist in the form definition will be updated.
}
```

### Summary of ``fields`` vs ``existing_fields``
* ``fields``: Updates **all fields**, including those not initially defined in the form. Use this when you need to pass
values for any field, whether defined or not.
* ``existing_fields``: Updates **only the defined fields**. Use this when you need to update the values of fields that are
part of the form definition.

### Methods Reference
* ``check_valid()``: Validates the form fields based on the defined rules (e.g., required, format).
* Returns ``true`` if valid, ``false`` otherwise.
* ``value_fields``: Retrieves the current values of all fields in the form.

## CRFormData Class
The ``CRFormData`` class provides flexible configuration for data formats and error classes in the library.
It allows you to set the date and time formats, as well as the error display class.

### Static Properties:
* ``default_formats``: An object containing default date and time formats, as well as input masks.
  * ``'format_datetime'``: Format for date and time (default: ``dd.MM.yyyy HH:mm``).
  * ``'format_date'``: Format for date (default: ``dd.MM.yyyy``).
  * ``'mask_datetime'``: Mask for date and time input (default: ``__.__.____ __:__``).
  * ``'mask_date'``: Mask for date input (default: ``__.__.____``).
* ``default_error_class``: Default class for error display (``b-danger``).
* ``formats``: The current data formats. Initially set to ``default_formats``.
* ``default_error_class``: The current error class. Initially set to  ``default_formats``.

### Static Methods:
* ``set_formats(formats)``: Method to set custom formats. Accepts an object with new date and time format values.
* ``set_error_class(error_class)``: Method to set a custom error class. Accepts a string with the error class name.

## Suggestions TODO
1. **Clarify Field Definitions**: Add an example where a field is conditionally required 
(e.g., based on another field's value), to show dynamic validation.
2. **Error Handling**: Add a section on handling validation errors, e.g., how to retrieve error messages for each field.
3. **Customization**: Provide an example showing how you can extend or customize field types
(e.g., creating a custom ``Field`` class for other types of input).
4. **Form Reset**: Include an example for resetting a form to its initial state after submission or validation errors.
