(() => {
  if (typeof openListingDetails !== 'function' || typeof listingFromKey !== 'function') return;

  const originalOpenListingDetails = openListingDetails;

  function formatItemNumber(item) {
    if (item?.id) {
      const compactId = String(item.id).replace(/[^a-zA-Z0-9]/g, '').slice(0, 12).toUpperCase();
      return `Item # ${compactId}`;
    }
    const sampleIndex = typeof starterListings !== 'undefined' ? starterListings.indexOf(item) : -1;
    return `Item # SAMPLE-${String(Math.max(sampleIndex, 0) + 1).padStart(3, '0')}`;
  }

  function decorateListingDetails(item) {
    const title = document.querySelector('#detailTitle');
    const description = document.querySelector('#detailDescription');
    const condition = document.querySelector('#detailCondition');
    const buyButton = document.querySelector('#detailBuyButton');
    if (!title || !description) return;

    let itemNumber = document.querySelector('#detailItemNumber');
    if (!itemNumber) {
      itemNumber = document.createElement('p');
      itemNumber.id = 'detailItemNumber';
      itemNumber.className = 'listing-item-number';
      itemNumber.style.cssText = 'margin:0;color:var(--muted);font-size:.82rem;font-weight:900;letter-spacing:.04em';
      title.insertAdjacentElement('afterend', itemNumber);
    }
    itemNumber.textContent = formatItemNumber(item);

    let descriptionLabel = document.querySelector('#detailDescriptionLabel');
    if (!descriptionLabel) {
      descriptionLabel = document.createElement('strong');
      descriptionLabel.id = 'detailDescriptionLabel';
      descriptionLabel.textContent = 'Item description';
      descriptionLabel.style.cssText = 'display:block;margin:2px 0 -6px;font-size:.9rem';
    }

    itemNumber.insertAdjacentElement('afterend', descriptionLabel);
    descriptionLabel.insertAdjacentElement('afterend', description);
    if (condition) description.insertAdjacentElement('afterend', condition);

    if (buyButton && item?.title) {
      buyButton.setAttribute('aria-label', `Buy ${item.title}, ${itemNumber.textContent}`);
    }
  }

  openListingDetails = function (item) {
    originalOpenListingDetails(item);
    decorateListingDetails(item);
  };

  const listingGrid = document.querySelector('#listingGrid');
  if (!listingGrid) return;

  listingGrid.addEventListener('click', event => {
    const buyButton = event.target.closest('.buy-button[data-buy]');
    if (!buyButton) return;

    const card = buyButton.closest('[data-listing-key]');
    if (!card) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    openListingDetails(listingFromKey(card.dataset.listingKey));
  }, true);
})();
