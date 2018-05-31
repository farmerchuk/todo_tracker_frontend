const TodoTracker = {
  $todosHeaders: $('#menu .grouping-header'),
  $todosGroupings: $('#menu .groupings'),
  $allTodosGroupings: $('#all-todos .groupings'),
  $allCompletedTodosGroupings: $('#completed-todos .groupings'),
  $todoList: $('#todo-list'),
  $addNewTodo: $('#add-new-todo'),
  $modalForm: $('#modal form'),
  $modalFormSave: $('#modal input[value="Save"]'),
  $modalFormMarkComplete: $('#modal input[name="mark-complete"]'),
  $overlay: $('#overlay'),

  handlebarsTemplates: {},

  monthsAsNumbers: {
    'January': '1', 'February': '2', 'March': '3', 'April': '4',
    'May': '5', 'June': '6', 'July': '7', 'August': '8',
    'September': '9', 'October': '10', 'November': '11', 'December': '12',
  },

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
    this.$todoList.on('click', '.checkbox', this.toggleTodoCompleted.bind(this));
    this.$todoList.on('click', 'p', this.showEditTodo.bind(this));
    this.$addNewTodo.on('click', this.showNewModal.bind(this));
    this.$overlay.on('click', this.hideModal.bind(this));
    this.$modalForm.on('click', 'input[name="new-todo"]', this.createTodo.bind(this));
    this.$modalForm.on('click', 'input[name="edit-todo"]', this.editTodo.bind(this));
    this.$todosHeaders.on('click', this.showTodos.bind(this));
    this.$todosGroupings.on('click', 'li', this.showTodos.bind(this));
  },

  showTodos(e) {
    $.ajax({
      method: 'get',
      url: '/api/todos',
      dataType: 'json',
      success: json => {
        const headerId = $(e.currentTarget).closest('section').attr('id');

        if ($(e.currentTarget).hasClass('grouping-header')) {
          this.showAllOrCompletedTodos(headerId, json);
        } else if ($(e.currentTarget).hasClass('grouping')) {
          this.showTodosByGrouping(e, json);
        }
      },
    });
  },

  showAllOrCompletedTodos(headerId, json) {
    if (headerId === 'all-todos') {
      this.refreshTodos(json);
    } else if (headerId === 'completed-todos') {
      const completedTodos = json.filter(todo => todo.completed);
      this.refreshTodos(completedTodos);
    }
  },

  showTodosByGrouping(e, json) {
    const groupingTitle = $(e.target).closest('p').html();
    const date = this.parseDateFromGroupingTitle(groupingTitle);
    let thisGroupingsTodos;

    if (date) {
      thisGroupingsTodos = json.filter(todo => {
        return todo.day === date.day && todo.month === date.month && todo.year === date.year;
      });
    } else {
      thisGroupingsTodos = json.filter(todo => {
        return todo.day === null && todo.month === null && todo.year === null;
      });
    }

    this.refreshTodos(thisGroupingsTodos);
  },

  parseDateFromGroupingTitle(groupingTitle) {
    if (groupingTitle === 'No due date') return null;

    let [dd, mm, yyyy] = groupingTitle.split('/');
    return {day: dd, month: mm, year: yyyy};
  },

  showNewModal() {
    this.$modalFormSave.attr('name', 'new-todo');
    this.showModal();
  },

  createTodo(e) {
    e.preventDefault();

    const formData = this.$modalForm.serializeArray();
    const formattedData = this.formatFormDate(formData);
    const serializedFormData = $.param(formData);

    this.createTodoAjax(serializedFormData);
    this.clearModalForm();
    this.hideModal();
  },

  createTodoAjax(serializedFormData) {
    $.ajax({
      method: 'post',
      url: '/api/todos',
      data: serializedFormData,
      success: this.refreshPage.bind(this),
    });
  },

  toggleTodoCompleted(e) {
    const $todo = $(e.target).closest('.todo');
    const todoId = $todo.attr('data-id');

    this.toggleTodoCompletedAjax(todoId);
  },

  toggleTodoCompletedAjax(id) {
    $.ajax({
      method: 'post',
      url: '/api/todos/' + id + '/toggle_completed',
      success: this.refreshPage.bind(this),
    });
  },

  showEditTodo(e) {
    const $todo = $(e.target).closest('.todo');
    const todoId = $todo.attr('data-id');

    this.populateFormByTodoId(todoId);
    this.$modalFormSave.attr('name', 'edit-todo');
    this.$modalFormSave.attr('data-id', todoId);
    this.showModal();
  },

  populateFormByTodoId(id) {
    $.ajax({
      method: 'get',
      url: '/api/todos/' + id,
      dataType: 'json',
      success: this.populateFormWithTodoData.bind(this),
    });
  },

  populateFormWithTodoData(json) {
    const formattedDay = this.removeLeadingZero(json.day);
    const monthNum = this.removeLeadingZero(json.month);
    const formattedMonth = this.convertNumToMonth(monthNum);

    this.$modalForm.find('input[name="title"]').val(json.title);
    this.$modalForm.find('select[name="day"]').val(formattedDay);
    this.$modalForm.find('select[name="month"]').val(formattedMonth);
    this.$modalForm.find('select[name="year"]').val(json.year);
    this.$modalForm.find('textarea[name="description"]').html(json.description);
  },

  editTodo(e) {
    e.preventDefault();

    const todoId = this.$modalFormSave.attr('data-id');
    const formData = this.$modalForm.serializeArray();
    const formattedData = this.formatFormDate(formData);
    const serializedFormData = $.param(formData);

    this.updateTodoAjax(serializedFormData, todoId);
    this.clearModalForm();
    this.hideModal();
  },

  updateTodoAjax(serializedFormData, todoId) {
    $.ajax({
      method: 'put',
      url: '/api/todos/' + todoId,
      data: serializedFormData,
    });
  },

  formatFormDate(formData) {
    formData.forEach(input => {
      if (input.name === 'day' && input.value.length === 1) {
        input.value = input.value.padStart(2, '0');
      }
      if (input.name === 'month') {
        if (this.monthsAsNumbers[input.value].length === 1) {
          input.value = this.monthsAsNumbers[input.value].padStart(2, '0');
        } else {
          input.value = this.monthsAsNumbers[input.value];
        }
      }
    });

    return formData;
  },

  removeLeadingZero(numberAsString) {
    return numberAsString[0] === '0' ? numberAsString[1] : numberAsString;
  },

  convertNumToMonth(numAsString) {
    for (let prop in this.monthsAsNumbers) {
      if (this.monthsAsNumbers[prop] === numAsString) return prop;
    }
  },

  deleteTodo(e) {
    const $todo = $(e.target).closest('li.todo');
    const todoId = $todo.attr('data-id');

    $todo.remove();
    this.deleteTodoAjax(todoId);
  },

  deleteTodoAjax(id) {
    $.ajax({
      method: 'delete',
      url: '/api/todos/' + id,
      success: this.refreshPage.bind(this),
    });
  },

  showModal() {
    this.$modalForm.fadeIn(200);
    this.$overlay.fadeIn(200);
  },

  hideModal() {
    this.$modalForm.fadeOut(200);
    this.$overlay.fadeOut(200, e => this.clearModalForm());
  },

  clearModalForm() {
    this.$modalForm.get(0).reset();
    this.$modalForm.find('textarea[name="description"]').html('');
  },

  refreshPage() {
    $.ajax({
      method: 'get',
      url: '/api/todos',
      dataType: 'json',
      success: json => {
        this.refreshTodosGroupings(json);
        this.refreshTodos(json);
        this.refreshTodosHeaderCounts(json);
      },
    });
  },

  refreshTodosGroupings(json) {
    this.refreshAllTodosGroupings(json);
    this.refreshCompletedTodosGroupings(json);
  },

  refreshAllTodosGroupings(json) {
    const allTodosGroupedByDate = this.groupAllTodosByDate(json);
    const todosHtml = this.handlebarsTemplates.todosGroupingsTemplate({groupings: allTodosGroupedByDate});

    this.$allTodosGroupings.html(todosHtml);
  },

  refreshCompletedTodosGroupings(json) {
    const completedTodos = json.filter(todo => todo.completed);
    const allTodosGroupedByDate = this.groupAllTodosByDate(completedTodos);
    const todosHtml = this.handlebarsTemplates.todosGroupingsTemplate({groupings: allTodosGroupedByDate});

    this.$allCompletedTodosGroupings.html(todosHtml);
  },

  groupAllTodosByDate(json) {
    const arrayOfTodosGroups = [];
    const todosGroups = this.groupTodos(json);

    for (let prop in todosGroups) {
      const groupingDate = prop;
      const groupingCount = todosGroups[prop];

      arrayOfTodosGroups.push({date: groupingDate, count: groupingCount})
    }

    return arrayOfTodosGroups;
  },

  groupTodos(json) {
    const todosGroups = {};

    json.forEach(todo => {
      let groupingDate;

      if (todo.day && todo.month && todo.year) {
        groupingDate = [todo.day, todo.month, todo.year].join('/');;
      } else {
        groupingDate = 'No due date';
      }

      todosGroups[groupingDate] = todosGroups[groupingDate] || 0;
      todosGroups[groupingDate] += 1;
    });

    return todosGroups;
  },

  refreshTodos(json) {
    const todosHtml = this.handlebarsTemplates.todosTemplate({todos: json});

    this.$todoList.html(todosHtml)
  },

  refreshTodosHeaderCounts(json) {
    this.refreshTodosCount(json);
  },

  refreshTodosCount(json) {
    $('#todos .grouping-header .count').html(json.length);
  },

  init() {
    this.createHandlebarsTemplates();
    this.bind();
    this.refreshPage();
  },
}

TodoTracker.init();
