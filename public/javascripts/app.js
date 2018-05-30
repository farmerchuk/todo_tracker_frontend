const TodoTracker = {
  $todoList: $('#todo-list'),
  $addNewTodo: $('#add-new-todo'),
  $modalForm: $('#modal form'),
  $modalFormSave: $('#modal input[name="save"]'),
  $modalFormMarkComplete: $('#modal input[name="mark-complete"]'),
  $overlay: $('#overlay'),

  handlebarsTemplates: {},

  createHandlebarsTemplates() {
    this.createTemplates();
    this.registerPartials();
  },

  createTemplates() {
    const $handlebarsScripts = $('script[type="text/x-handlebars"]');

    $handlebarsScripts.each(this.createHandlebarTemplate.bind(this));
  },

  createHandlebarTemplate(idx, script) {
    const $script = $(script);
    const scriptId = $script.attr('id');

    this.handlebarsTemplates[scriptId] = Handlebars.compile($script.html());
  },

  registerPartials() {
    const $handlebarsScriptsPartials = $('script[type="text/x-handlebars"][class="partial"]');

    $handlebarsScriptsPartials.each(this.registerPartial.bind(this));
  },

  registerPartial(idx, script) {
    const $script = $(script);
    const scriptId = $script.attr('id');

    Handlebars.registerPartial(scriptId, $script.html());
  },

  bind() {
    this.$todoList.on('click', '.trash', this.deleteTodo.bind(this));
    this.$addNewTodo.on('click', this.showModal.bind(this));
    this.$overlay.on('click', this.hideModal.bind(this));
    this.$modalForm.on('click', 'input[name="save"]', this.createTodo.bind(this));
  },

  createTodo(e) {
    e.preventDefault();

    const formData = this.$modalForm.serializeArray();
    const formattedData = this.formatFormDate(formData);
    const serializedFormData = $.param(formData);

    this.createTodoAjax(serializedFormData);
    this.hideModal();
  },

  createTodoAjax(serializedFormData) {
    $.ajax({
      method: 'post',
      url: '/api/todos',
      data: serializedFormData,
      success: this.refreshAllTodos.bind(this),
    });
  },

  refreshAllTodos() {
    $.ajax({
      method: 'get',
      url: '/api/todos',
      dataType: 'json',
      success: this.displayAllTodos.bind(this),
    });
  },

  displayAllTodos(json) {
    console.log(json);
  },

  formatFormDate(formData) {
    const monthsAsNumbers = {
      'January': '1', 'February': '2', 'March': '3', 'April': '4',
      'May': '5', 'June': '6', 'July': '7', 'August': '8',
      'September': '9', 'October': '10', 'November': '11', 'December': '12',
    }

    formData.forEach(input => {
      if (input.name === 'day' && input.value.length === 1) {
        input.value = input.value.padStart(2, '0');
      }
      if (input.name === 'month') {
        if (monthsAsNumbers[input.value].length === 1) {
          input.value = monthsAsNumbers[input.value].padStart(2, '0');
        } else {
          input.value = monthsAsNumbers[input.value];
        }
      }
    });

    return formData;
  },

  deleteTodo(e) {
    const $todo = $(e.target).closest('li.todo');
    $todo.remove();
  },

  showModal() {
    this.$modalForm.fadeIn(200);
    this.$overlay.fadeIn(200);
  },

  hideModal() {
    this.$modalForm.fadeOut(200);
    this.$overlay.fadeOut(200);
  },

  init() {
    this.createHandlebarsTemplates();
    this.bind();
  },
}

TodoTracker.init();
